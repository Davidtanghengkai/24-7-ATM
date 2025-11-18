const dbConfig = require("../dbConfig");
const { TranslationServiceClient } = require('@google-cloud/translate').v3beta1;

class TranslationModel {
    constructor() {
        if (!process.env.GOOGLE_PROJECT_ID || !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            throw new Error('Missing required Google Cloud configuration. Please set GOOGLE_PROJECT_ID and GOOGLE_APPLICATION_CREDENTIALS');
        }

        this.translationClient = new TranslationServiceClient({
            projectId: process.env.GOOGLE_PROJECT_ID,
            keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
        });
        
        this.location = 'global';
        this.translationCache = new Map();
        this.projectId = process.env.GOOGLE_PROJECT_ID;
    }

    async getTranslations(targetLang = 'English') {
        const cacheKey = `translations_${targetLang}`;
        if (this.translationCache.has(cacheKey)) {
            return this.translationCache.get(cacheKey);
        }
        
        // --- Language Code Mapping ---
        const languageCodeMap = {
            'English': 'en',
            'Chinese': 'zh',
            'Tamil': 'ta',
            'Malay': 'ms',
            'Korean': 'ko',
            'Japanese': 'ja',
            'Arabic': 'ar',
            'Bengali': 'bn'
        };
        
        // Define source strings in English
        const sourceStrings = {
            // Keys from index.html
            exitLink: 'Exit',
            loginWithoutCardTitle: 'Login without Card',
            loginWithoutCardSubtitle: 'via Multi-Factor Authentication',
            createCardTitle: 'Create Card',
            createCardSubtitle: 'make new card',
            governmentPayoutTitle: 'Government Payout',
            backLink: 'Back',
            loginGreeting: 'Hello!\nLogin via OCBC App / Face Verification',
            emailVerificationCard: 'Email verification',
            faceIdCard: 'Face ID',
            faceVerificationTitle: 'Face Verification',
            faceVerificationInstruction: 'Position your face within the frame',
            faceStatusScanning: 'Scanning...',
            menuGreeting: 'Hello!\nWhat would you like to do today?',
            getCashHeader: 'Get Cash',
            otherAmountButton: 'Other Cash Amount',
            otherServicesHeader: 'Other Services',
            balanceInquiryCard: 'Balance\nInquiry',
            createCardCard: 'Create a\nCard',
            moreServicesLink: 'More services >',
            // Keys from new_more_features.html
            moreFeaturesSectionTitle: 'More Features',
            balanceEnquiryFeature: 'Balance\nEnquiry',
            billPaymentFeature: 'Bill\nPayment',
            overseasTransferFeature: 'Overseas\ntransfer',
            cpfServicesFeature: 'CPF\nServices',
            investmentServicesFeature: 'Investment\nServices',
            transferFundsFeature: 'Transfer\nFunds',
            scrollRight: '>',
            emailStepGreeting: 'Please enter your email to receive the OTP',
            emailPlaceholder: 'you@example.com',
            cancelButton: 'Cancel',
            sendOtpButton: 'Send OTP',
            otpStepGreeting: 'Please enter the OTP sent to',
            otpPlaceholder: '123456',
            verifyOtpButton: 'Verify OTP',
            cancelConfirmation: 'Are you sure you want to cancel the transaction?',
            cancelQuery: 'Is there anything else you would like to do?',
            cancelNo: 'No',
            cancelYes: 'Yes'
        };

        // Return source strings directly for English
        if (targetLang === 'English') {
            this.translationCache.set(cacheKey, sourceStrings);
            return sourceStrings;
        }

        try {
            const request = {
                parent: `projects/${this.projectId}/locations/${this.location}`,
                contents: Object.values(sourceStrings),
                mimeType: 'text/plain',
                sourceLanguageCode: 'en',
                // Dynamic lookup with 'en' fallback
                targetLanguageCode: languageCodeMap[targetLang] || 'en', 
            };

            const [response] = await this.translationClient.translateText(request);

            const translations = {};
            let i = 0;
            for (const key in sourceStrings) {
                translations[key] = response.translations[i].translatedText;
                i++;
            }

            this.translationCache.set(cacheKey, translations);
            return translations;
        } 
        catch (error) {
            console.error('Translation API error:', error);
            if (error.message.includes('Could not load the default credentials')) {
                throw new Error('Google Cloud credentials not configured. Set GOOGLE_APPLICATION_CREDENTIALS environment variable.');
            }
            throw error;
        }
    }
}

module.exports = TranslationModel;