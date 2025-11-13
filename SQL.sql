CREATE DATABASE ATM_System;
GO

-- Use the database
USE ATM_System;
GO

-- 1️⃣ Users Table
CREATE TABLE Users (
    userId INT IDENTITY(1,1) PRIMARY KEY,
    Name NVARCHAR(100) NOT NULL,
    Dob NVARCHAR(100),
    nationalId NVARCHAR(20) UNIQUE NOT NULL
);

-- 2️⃣ Accounts Table
CREATE TABLE Accounts (
    accountNo INT IDENTITY(1000,1) PRIMARY KEY,
    userId INT NOT NULL,
    Balance DECIMAL(12,2) DEFAULT 0,
    Type NVARCHAR(50),
    FOREIGN KEY (userId) REFERENCES Users(userId)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- 3️⃣ Card Table
CREATE TABLE Card (
    cardNo INT IDENTITY(5000,1) PRIMARY KEY,
    accountNo INT NOT NULL,
    Status NVARCHAR(20) DEFAULT 'Active',
    ExpiryDate DATE NOT NULL,
    Pin CHAR(6) NOT NULL,
    Biometric VARBINARY(MAX),
    createdTime DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (accountNo) REFERENCES Accounts(accountNo)
        ON DELETE CASCADE
        ON UPDATE CASCADE
);

-- 1️⃣ Insert into Users table
INSERT INTO Users (Name, Dob, nationalId)
VALUES 
('John Tan', 'Software Engineer', 'S1234567A'),
('Mary Lim', 'Teacher', 'S2345678B'),
('Ahmad Ali', 'Nurse', 'S3456789C'),
('Siti Rahman', 'Bank Manager', 'S4567890D');

-- 2️⃣ Insert into Accounts table
INSERT INTO Accounts (userId, Balance, Type)
VALUES
(1, 5200.50, 'Savings'),
(1, 1500.00, 'Current'),
(2, 750.25, 'Savings'),
(3, 13200.00, 'Fixed Deposit'),
(4, 8900.10, 'Savings');

-- 3️⃣ Sample view queries
SELECT * FROM Users;
SELECT * FROM Accounts;
SELECT * FROM Card;
