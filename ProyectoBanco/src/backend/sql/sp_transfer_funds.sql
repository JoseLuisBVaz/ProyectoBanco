CREATE PROCEDURE sp_transfer_funds(
  IN  p_origin      VARCHAR(30),
  IN  p_destiny     VARCHAR(30),
  IN  p_amount      DECIMAL(12,2),
  IN  p_description VARCHAR(300)
)
BEGIN
  DECLARE v_origin_accountId INT;
  DECLARE v_dest_accountId   INT;
  DECLARE v_origin_balance   DECIMAL(12,2);
  DECLARE v_tranId           INT;
  DECLARE v_fee              DECIMAL(12,2);
  DECLARE v_not_found        INT DEFAULT 0;

  DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_not_found = 1;

  -- Validaciones básicas
  IF p_origin IS NULL OR p_destiny IS NULL OR p_amount IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Parámetros inválidos o nulos.';
  END IF;
  
  IF p_amount <= 0 THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El monto debe ser mayor a 0.';
  END IF;
  
  IF p_origin = p_destiny THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La cuenta origen y destino no pueden ser la misma.';
  END IF;

  -- Calcular comisión: 5 por cada 100 y 10 por cada 1500
  SET v_fee = (FLOOR(p_amount / 100) * 5) + (FLOOR(p_amount / 1500) * 10);

  START TRANSACTION;

  -- Buscar y bloquear cuenta ORIGEN
  SET v_not_found = 0;
  SELECT accountId, balance
    INTO v_origin_accountId, v_origin_balance
    FROM cAccount
    WHERE accNum = p_origin OR clabe = p_origin
    FOR UPDATE;
    
  IF v_not_found = 1 OR v_origin_accountId IS NULL THEN
    ROLLBACK;
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cuenta de origen no encontrada.';
  END IF;

  -- Buscar y bloquear cuenta DESTINO
  SET v_not_found = 0;
  SELECT accountId
    INTO v_dest_accountId
    FROM cAccount
    WHERE accNum = p_destiny OR clabe = p_destiny
    FOR UPDATE;
    
  IF v_not_found = 1 OR v_dest_accountId IS NULL THEN
    ROLLBACK;
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Cuenta de destino no encontrada.';
  END IF;

  IF v_origin_accountId = v_dest_accountId THEN
    ROLLBACK;
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La cuenta origen y destino no pueden ser la misma.';
  END IF;

  -- Verificar fondos suficientes (monto + comisión)
  IF v_origin_balance < (p_amount + v_fee) THEN
    ROLLBACK;
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Fondos insuficientes en la cuenta de origen.';
  END IF;

  -- Actualizar saldos
  UPDATE cAccount 
  SET balance = balance - (p_amount + v_fee) 
  WHERE accountId = v_origin_accountId;
  
  UPDATE cAccount 
  SET balance = balance + p_amount 
  WHERE accountId = v_dest_accountId;

  -- Registrar transferencia
  INSERT INTO transfer (origin, destiny, ammount, fee, description, doDate)
  VALUES (p_origin, p_destiny, p_amount, v_fee, p_description, CURDATE());

  SET v_tranId = LAST_INSERT_ID();

  COMMIT;

  -- Devolver resultado
  SELECT v_tranId AS tranId, v_fee AS fee;

END
