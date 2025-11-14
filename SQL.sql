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
);

-- Creating the Biometrics table
CREATE TABLE Biometrics (
    ID INT PRIMARY KEY IDENTITY(1,1), -- Auto-incremented ID
    userID INT NOT NULL, -- Reference to the User
    type VARCHAR(50), -- Type of biometric (fingerprint, face, etc.)
    bioData VARCHAR(50) -- Stores the biometric data in binary format
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
    CardNo INT PRIMARY KEY, -- Card number as the primary key
    UserID INT, -- Reference to the User
    AccountNo INT, -- Reference to the Account
    status VARCHAR(50), -- Card status (active, blocked, etc.)
    expiryDate DATE, -- Expiry date of the card
    PIN VARCHAR(4), -- 4-digit PIN
    createdTime DATETIME, -- Time the card was created
    FOREIGN KEY (UserID) REFERENCES User(id), -- Foreign Key referencing User table
    FOREIGN KEY (AccountNo) REFERENCES Accounts(AccountNo) -- Foreign Key referencing Accounts table
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
 

