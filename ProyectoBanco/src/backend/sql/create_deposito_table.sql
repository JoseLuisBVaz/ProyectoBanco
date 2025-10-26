-- Crear tabla de depósitos para Banco_Jety
USE Banco_Jety;

CREATE TABLE IF NOT EXISTS deposito (
    depId INT AUTO_INCREMENT PRIMARY KEY,
    mainId INT NOT NULL,
    accNum VARCHAR(10) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    description VARCHAR(300),
    depositDate TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_deposito_main FOREIGN KEY (mainId) REFERENCES main(mainId)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    CONSTRAINT fk_deposito_account FOREIGN KEY (accNum) REFERENCES cAccount(accNum)
        ON DELETE CASCADE
        ON UPDATE CASCADE,
    INDEX idx_deposito_mainId (mainId),
    INDEX idx_deposito_accNum (accNum),
    INDEX idx_deposito_date (depositDate)
);
