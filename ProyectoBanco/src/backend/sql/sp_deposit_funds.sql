-- =============================================
-- Stored Procedure: sp_deposit_funds
-- Descripción: Realiza un depósito a una cuenta
-- =============================================

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_deposit_funds$$

CREATE PROCEDURE sp_deposit_funds(
    IN p_mainId INT,
    IN p_amount DECIMAL(12,2),
    IN p_description VARCHAR(255)
)
BEGIN
    DECLARE v_account_id INT DEFAULT NULL;
    DECLARE v_current_balance DECIMAL(12,2) DEFAULT 0;
    DECLARE v_new_balance DECIMAL(12,2);
    DECLARE v_deposit_id INT;
    DECLARE v_accNum VARCHAR(10);
    
    -- Manejo de errores
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Error en el depósito: No se pudo completar la operación';
    END;

    -- Validar monto
    IF p_amount IS NULL OR p_amount <= 0 THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'El monto del depósito debe ser mayor a 0';
    END IF;

    START TRANSACTION;

    -- 1️⃣ Buscar la primera cuenta del usuario (sin validar status ya que no existe esa columna)
    SELECT accountId, balance, accNum INTO v_account_id, v_current_balance, v_accNum
    FROM cAccount
    WHERE mainId = p_mainId
    LIMIT 1;

    -- Validar que la cuenta existe
    IF v_account_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'No se encontró una cuenta para el usuario';
    END IF;

    -- 2️⃣ Calcular nuevo balance
    SET v_new_balance = v_current_balance + p_amount;

    -- 3️⃣ Actualizar el saldo de la cuenta
    UPDATE cAccount
    SET balance = v_new_balance
    WHERE accountId = v_account_id;

    -- 4️⃣ Registrar el depósito en la tabla deposito
    INSERT INTO deposito (mainId, accNum, amount, description)
    VALUES (p_mainId, v_accNum, p_amount, COALESCE(p_description, 'Depósito en efectivo'));

    SET v_deposit_id = LAST_INSERT_ID();

    COMMIT;

    -- 5️⃣ Retornar resultado
    SELECT 
        v_deposit_id AS depId,
        0.00 AS fee,
        v_new_balance AS newBalance,
        v_accNum AS accountNumber,
        'Depósito realizado exitosamente' AS message;

END$$

DELIMITER ;

