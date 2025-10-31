-- ============================================================
-- Banco_Jety - Esquema completo y procedimientos almacenados
-- Archivo único de base de datos para inicialización y mantenimiento
-- Última actualización: 2025-10-25
-- ============================================================

-- Crear base de datos si no existe
CREATE DATABASE IF NOT EXISTS Banco_Jety;
USE Banco_Jety;

-- =====================
-- Tablas principales
-- =====================

-- Tabla: main (usuarios)
CREATE TABLE IF NOT EXISTS main (
    mainId INT AUTO_INCREMENT PRIMARY KEY,
    mail VARCHAR(100) NOT NULL,
    pass VARCHAR(100) NOT NULL,
    rol  ENUM('c','e','m') NOT NULL
);

-- Tabla: customer
CREATE TABLE IF NOT EXISTS customer (
    mainId INT PRIMARY KEY,
    phoneNumber VARCHAR(12) NOT NULL,
    firstName   VARCHAR(100) NOT NULL,
    lastNameP   VARCHAR(50)  NOT NULL,
    lastNameM   VARCHAR(50)  NOT NULL,
    birthday    DATE NOT NULL,
    address     VARCHAR(250) NOT NULL,
    enterDate   TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    curp        VARCHAR(18) NOT NULL,
    rfc         VARCHAR(13),
    CONSTRAINT fk_customer_main FOREIGN KEY (mainId) REFERENCES main(mainId)
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- Tabla: employee
CREATE TABLE IF NOT EXISTS employee (
    mainId INT PRIMARY KEY,
    phoneNumber VARCHAR(12) NOT NULL,
    firstName   VARCHAR(100) NOT NULL,
    lastNameP   VARCHAR(50)  NOT NULL,
    lastNameM   VARCHAR(50)  NOT NULL,
    birthday    DATE NOT NULL,
    address     VARCHAR(250) NOT NULL,
    enterDate   TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    curp        VARCHAR(18) NOT NULL,
    rfc         VARCHAR(13),
    nss         VARCHAR(11),
    CONSTRAINT fk_employee_main FOREIGN KEY (mainId) REFERENCES main(mainId)
        ON DELETE CASCADE ON UPDATE CASCADE
);

-- Tabla: cAccount (cuentas)
CREATE TABLE IF NOT EXISTS cAccount (
    accountId INT AUTO_INCREMENT PRIMARY KEY,
    mainId    INT NOT NULL,
    cardNum   VARCHAR(16) NOT NULL,
    balance   DECIMAL(12,2) NOT NULL DEFAULT 0,
    clabe     VARCHAR(18) NOT NULL,
    accNum    VARCHAR(10) NOT NULL,
    accPhone  VARCHAR(10),
    accType   ENUM('Debito','Credito') NOT NULL,
    CONSTRAINT fk_caccount_main FOREIGN KEY (mainId) REFERENCES main(mainId)
        ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE KEY uq_caccount_cardNum (cardNum),
    UNIQUE KEY uq_caccount_clabe   (clabe),
    UNIQUE KEY uq_caccount_accNum  (accNum),
    INDEX idx_caccount_mainId (mainId)
);

-- Tabla: transfer (transferencias)
CREATE TABLE IF NOT EXISTS transfer (
    tranId      INT AUTO_INCREMENT PRIMARY KEY,
    origin      VARCHAR(30)  NOT NULL,
    destiny     VARCHAR(30)  NOT NULL,
    ammount     DOUBLE       NOT NULL,
    fee         DOUBLE       NOT NULL,
    description VARCHAR(300),
    doDate      DATE
);

-- Tabla: deposito (histórico de depósitos)
CREATE TABLE IF NOT EXISTS deposito (
    depId       INT AUTO_INCREMENT PRIMARY KEY,
    mainId      INT NOT NULL,
    accNum      VARCHAR(10) NOT NULL,
    amount      DECIMAL(12,2) NOT NULL,
    description VARCHAR(300),
    depositDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_deposito_main    FOREIGN KEY (mainId) REFERENCES main(mainId)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_deposito_account FOREIGN KEY (accNum) REFERENCES cAccount(accNum)
        ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_deposito_mainId (mainId),
    INDEX idx_deposito_accNum (accNum),
    INDEX idx_deposito_date (depositDate)
);

create table if not exists retiros (
  withdrawid int auto_increment primary key,
  mainid int not null,
  accnum varchar(10) not null,
  amount decimal(12,2) not null,
  description varchar(300),
  withdrawdate timestamp default current_timestamp,
  constraint fk_retiros_main foreign key (mainid) references main(mainid)
    on delete cascade on update cascade,
  constraint fk_retiros_acc foreign key (accnum) references caccount(accnum)
    on delete cascade on update cascade,
  index idx_retiros_mainid (mainid),
  index idx_retiros_accnum (accnum),
  index idx_retiros_date (withdrawdate)
);

-- =============================================
-- Procedimientos almacenados (SPs)
-- =============================================

-- SP: sp_transfer_funds
DELIMITER $$
DROP PROCEDURE IF EXISTS sp_transfer_funds $$
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

END $$
DELIMITER ;

-- SP: sp_deposit_funds
DELIMITER $$
DROP PROCEDURE IF EXISTS sp_deposit_funds $$
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

    -- Buscar la primera cuenta del usuario
    SELECT accountId, balance, accNum INTO v_account_id, v_current_balance, v_accNum
    FROM cAccount
    WHERE mainId = p_mainId
    LIMIT 1;

    -- Validar que la cuenta existe
    IF v_account_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'No se encontró una cuenta para el usuario';
    END IF;

    -- Calcular nuevo balance
    SET v_new_balance = v_current_balance + p_amount;

    -- Actualizar el saldo de la cuenta
    UPDATE cAccount
    SET balance = v_new_balance
    WHERE accountId = v_account_id;

    -- Registrar el depósito
    INSERT INTO deposito (mainId, accNum, amount, description)
    VALUES (p_mainId, v_accNum, p_amount, COALESCE(p_description, 'Depósito en efectivo'));

    SET v_deposit_id = LAST_INSERT_ID();

    COMMIT;

    -- Retornar resultado
    SELECT 
        v_deposit_id AS depId,
        0.00 AS fee,
        v_new_balance AS newBalance,
        v_accNum AS accountNumber,
        'Depósito realizado exitosamente' AS message;

END $$
DELIMITER ;

-- Fin del archivo
