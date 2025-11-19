-- Create the Database
CREATE DATABASE BankingSystem;

-- Use the created database
USE BankingSystem;

-- Creating the User table with a reference to the Biometrics table
CREATE TABLE User (
    id INT PRIMARY KEY IDENTITY(1,1), -- Auto-incremented user ID
    name VARCHAR(255),
    DOB DATE,
    nationalID VARCHAR(50),
    Email VARCHAR(255) UNIQUE,
);

-- Creating the Biometrics table
CREATE TABLE Biometrics (
    ID INT PRIMARY KEY IDENTITY(1,1), -- Auto-incremented ID
    userID INT NOT NULL, -- Reference to the User
    type VARCHAR(50), -- Type of biometric (fingerprint, face, etc.)
    bioData NVARCHAR(MAX) -- Stores the biometric data in binary format
    Foreign KEY (userID) REFERENCES User(id) -- Foreign Key referencing User table
);

-- Creating the Accounts table
CREATE TABLE Accounts (
    AccountNo INT PRIMARY KEY IDENTITY(1,1), -- Auto-incremented Account Number
    userID INT, -- Reference to the User
    Balance DECIMAL(18, 2), -- Account balance
    Type VARCHAR(50), -- Type of account (savings, checking, etc.)
    FOREIGN KEY (userID) REFERENCES User(id) -- Foreign Key referencing User table
);

-- Creating the Card table
CREATE TABLE Card (
    CardNo INT PRIMARY KEY IDENTITY(1,1), -- Card number as the primary key
    UserID INT, -- Reference to the User
    AccountNo INT, -- Reference to the Account
    status VARCHAR(50), -- Card status (active, blocked, etc.)
    expiryDate DATE, -- Expiry date of the card
    PIN VARCHAR(6), -- 6-digit PIN
    createdTime DATETIME, -- Time the card was created
    FOREIGN KEY (UserID) REFERENCES User(id), -- Foreign Key referencing User table
    FOREIGN KEY (AccountNo) REFERENCES Accounts(AccountNo) -- Foreign Key referencing Accounts table
);

-- Insert into Users table
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

-- Creating the Authlog table
CREATE TABLE Authlog (
    Id INT PRIMARY KEY IDENTITY(1,1), -- Auto-incremented Authlog ID
    atmID INT, -- ATM machine ID
    cardNo INT, -- Card Number
    userID INT, -- Reference to the User
    loginAction VARCHAR(50), -- Action (login attempt, logout, etc.)
    result VARCHAR(50), -- Result of the action (success, failure)
    reason VARCHAR(255), -- Reason for failure, if any
    timestamp DATETIME, -- Timestamp of the action
    FOREIGN KEY (userID) REFERENCES User(id), -- Foreign Key referencing User table
    FOREIGN KEY (cardNo) REFERENCES Card(CardNo) -- Foreign Key referencing Card table
);

-- Creating the Bank table
CREATE TABLE Bank (
    bankID INT PRIMARY KEY IDENTITY(1,1),
    bankName VARCHAR(100) NOT NULL,
    country VARCHAR(50) NOT NULL,
    currency VARCHAR(10) NOT NULL
);

-- Creating the BlockchainUser table
CREATE TABLE BlockchainUser (
    bcUserID INT PRIMARY KEY IDENTITY(1,1),
    accountNo VARCHAR(30) NOT NULL,         -- External user's account number
    bankName VARCHAR(100) NOT NULL,         -- Receiver bank name
    country VARCHAR(50) NOT NULL,           -- Receiver country
    identityHash VARCHAR(64) NOT NULL,      -- SHA-256(accountNo + bankName + country)
    verifiedByBankID INT NULL,              -- Which bank verified this user
    registeredAt DATETIME DEFAULT GETDATE(),
    FOREIGN KEY (verifiedByBankID) REFERENCES Bank(bankID)
);

-- Creating the Transactions table
CREATE TABLE Transactions (
    txnID INT PRIMARY KEY IDENTITY(1,1),          -- Unique transaction ID
    senderAccountNo INT NOT NULL,                 -- FK -> Accounts(AccountNo)
    receiverAccountNo VARCHAR(20) NOT NULL,       -- Receiver's account number
    bankID INT NOT NULL,                          -- FK -> Bank(bankID)
    amount DECIMAL(18, 2) NOT NULL,               -- Amount in SGD
    currency VARCHAR(10) NOT NULL,                -- Recipient's currency (MYR, USD, etc.)
    exchangeRate DECIMAL(10,4) NOT NULL,          -- Conversion rate at time of transfer
    totalConverted DECIMAL(18,2) NULL,            -- Calculated amount in target currency
    status VARCHAR(20) DEFAULT 'Pending',         -- Transaction status (Pending, Confirmed, Failed)
    txnType VARCHAR(20) DEFAULT 'Overseas',       -- Local / Overseas
    timestamp DATETIME DEFAULT GETDATE(),         -- Timestamp of transaction
    blockID INT NULL,                             -- BlockchainLedger reference (optional)
    FOREIGN KEY (senderAccountNo) REFERENCES Accounts(AccountNo),
    FOREIGN KEY (bankID) REFERENCES Bank(bankID)
);

-- Creating the BlockchainLedger table
CREATE TABLE BlockchainLedger (
    blockID INT PRIMARY KEY IDENTITY(1,1),
    previousHash VARCHAR(64),
    currentHash VARCHAR(64),
    transactionData VARCHAR(MAX),
    timestamp DATETIME DEFAULT GETDATE(),
    validatedBy VARCHAR(50) -- e.g. 'ATM001', 'BankServer'
);

INSERT INTO Bank (bankName, country, currency)
VALUES
('Maybank', 'Malaysia', 'MYR'),
('CIMB', 'Malaysia', 'MYR'),
('RHB Bank', 'Malaysia', 'MYR'),
('OCBC Malaysia', 'Malaysia', 'MYR'),
('Bank of America', 'United States', 'USD'),
('Chase', 'United States', 'USD'),
('Wells Fargo', 'United States', 'USD'),
('Citibank', 'United States', 'USD'),
('Bangkok Bank', 'Thailand', 'THB'),
('Kasikorn Bank', 'Thailand', 'THB'),
('BDO', 'Philippines', 'PHP'),
('Metrobank', 'Philippines', 'PHP');

Insert INTO BlockchainUser(accountNo,bankName,country,identityHash,verifiedByBankID)
VALUES
(12345678 ,'Maybank', 'Malaysia', '58322009a367bc8b4288f26084de874f0c6b9dd34e74a2eeda3260c3446591b4','1'),
(22334455 ,'CIMB', 'Malaysia', 'a40d9e5339ad30ed8def009356b184aadc2e61a4e4cae7e599d7a71f9f546eac','2'),
(55667788 ,'RHB Bank', 'Malaysia', 'f6771c720d51376a49f4ae3dea1ac53a32a6445245507b09838dbf2ccc131377','3'),
(77889911 ,'OCBC Malaysia', 'Malaysia', '6c94bede296423d3cdcf28aeb8ee74ed72b254d716f3723eb35223e36848a143','4'),
(11112222 ,'Bank of America', 'United States', '5bc048ecf823edfa4080d7dd9ed4e2ef883cc94e9b9a6f6e60e3a1b6be043f55','5'),
(33334444 ,'Chase', 'United States', 'b64ea77cf7fbb0c00ded05140e5302008f4cbb638c2b8c58bae9fa34467b011f','6'),
(55556666 ,'Wells Fargo', 'United States', '5da5d8d1cc38c0d26b71d43325e96b2e2c6f6ed0df41e48d12a117614cd62fa4','7'),
(77778888 ,'Citibank', 'United States', '1aa98c7f8e5547f06c8fee59c803c8e1993565f6379c886a27cc5a9c66f8e731','8'),
(99990000 ,'Bangkok Bank', 'Thailand', '19ac7c6d9f5cb3581ff2048385a4df5d78a401cda66a0458b93525410a9d03b5','9'),
(12344321 ,'Kasikorn Bank', 'Thailand', '600857cdfa6a6c74127982075f4494570e2ec70872451a183ce98530335539ea','10'),
(87654321 ,'BDO', 'Philippines', '26cf88ec9f61b4df2cf87bdc3d52a8d24121f1864993f5e76afb3060e528b2d2','11'),
(90909090 ,'Metrobank', 'Philippines', '8e7c07235845b0c2ac89fb83feaae450808e53685aa8119d016d84146ffb86cf','12'),
