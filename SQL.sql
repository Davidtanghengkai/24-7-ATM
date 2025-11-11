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
    biometricID INT, -- Reference to the Biometrics table
    FOREIGN KEY (biometricID) REFERENCES Biometrics(ID) -- Foreign Key referencing Biometrics table
);

-- Creating the Biometrics table
CREATE TABLE Biometrics (
    ID INT PRIMARY KEY IDENTITY(1,1), -- Auto-incremented ID
    type VARCHAR(50), -- Type of biometric (fingerprint, face, etc.)
    bioData VARCHAR(50) -- Stores the biometric data in binary format
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