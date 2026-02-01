# 24-7 ATM — Next-Generation Smart ATM System

## Overview

**24-7 ATM** is a group project developed in collaboration with **OCBC**, aimed at reimagining the traditional ATM for the digital era.

As banking increasingly moves online, physical ATMs risk becoming outdated. Our project explores how ATMs can remain relevant by introducing smarter authentication, enhanced security, AI-assisted support, and more inclusive accessibility.

The goal is to transform ATMs from simple cash machines into **secure, intelligent self-service banking hubs**.

---

## Problems Addressed

Current ATMs face several limitations:

- Language barriers for non-English users  
- Rising fraud and scam risks  
- Limited assistance compared to mobile banking  
- Slow and insecure transactions  
- Dependency on physical cards  

---

## Key Features

1. New Account & Card Creation  
2. Cardless Login (NFC & FaceID)  
3. Multi-Language Support  
4. Non-Generative AI Chatbot with Voice-to-Text  
5. Video Teller Assistance  
6. Secure Overseas Transfers  
7. Instant Account Freezing  
8. Real-Time Notification System  
9. Fraud Detection System  

---

## Feature Details

### 1. New Account & Card Creation

Users (new or existing) can create bank accounts and cards directly at the ATM.

This feature simulates integration with government services such as **SingPass** for identity verification via facial recognition.

#### New Users

- Scan face for identity verification  
- Enter personal details  
- Create first bank account  
- Optionally request a new card  

#### Existing Users

- Authenticate via FaceID  
- Select existing account to issue a new card  
- Or create an additional account  
- New account flow mirrors that of new users  

---

### 2. Cardless Login (NFC & FaceID)

Users can access ATM services without carrying a physical card.

#### NFC Login

- Log in through the OCBC mobile app  
- Select account and card  
- Tap phone on ATM for instant access  

#### FaceID Login

- Scan face for authentication  
- View linked accounts and cards  
- Select preferred card to proceed  

---

### 3. Multi-Language Support

The ATM supports a wide range of languages to improve accessibility:

- English  
- Chinese  
- Korean  
- Tamil  
- Malay  
- Arabic  
- Burmese  
- And more  

---

### 4. Non-Generative AI Chatbot with Voice-to-Text

A rule-based AI chatbot assists users by:

- Converting speech to text  
- Understanding user intent  
- Redirecting users to relevant ATM functions  
- Providing step-by-step guidance  

This avoids generative AI risks while maintaining reliability and security.

---

### 5. Video Teller Assistance

Users can initiate a live video call with a human teller directly from the ATM.

This allows real-time help without visiting a physical bank branch and can be triggered manually or through the AI chatbot.

---

### 6. Secure Overseas Transfers

International transfers are secured using blockchain-based principles.

A rule-based validation system flags risky transactions and requires additional user authentication before completion.

---

### 7. Instant Account Freezing

Accessible only through FaceID login for security.

Users may:

- Freeze a single account  
- Freeze all accounts under their identity  

Confirmation is required before execution.

Unfreezing can only be performed in person with a human teller to prevent misuse.

---

### 8. Real-Time Notification System

Whenever an ATM session starts:

- A notification is sent to the OCBC mobile app  
- Users must approve or deny the session  

If denied, the ATM session is immediately terminated.

---

### 9. Fraud Detection System

A rule-based fraud engine monitors suspicious activity, including:

1. Receiver account is newly created  
2. Transfer amount exceeds 50% of total balance  
3. Transactions occurring at unusual hours (e.g., midnight)  
4. Multiple transfers within a 5-minute window  

Flagged transactions trigger additional verification.

---

## Summary

24-7 ATM demonstrates how future ATMs can combine **biometric authentication, mobile integration, AI assistance, and enhanced fraud prevention** to deliver a safer, smarter, and more accessible banking experience.

This project showcases a practical vision for next-generation self-service banking.

