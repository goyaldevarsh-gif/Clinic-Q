/** Fill these before real patients use the app. The notice below is a DRAFT and must be reviewed by a qualified person. */
export const CONTACT = 'the clinic reception';
export const NOTICE_VERSION = 'draft-1';
export const NOTICE: { h: string; hHi: string; p: string; pHi: string }[] = [
  { h: 'What we collect', hHi: 'हम क्या जानकारी लेते हैं',
    p: 'Your mobile number, and for each person you book for: name, age, the appointment (clinic, doctor, date, time, token) and the reason you type in, if any.',
    pHi: 'आपका मोबाइल नंबर, और जिस व्यक्ति के लिए आप बुक करते हैं उसका नाम, उम्र, अपॉइंटमेंट (क्लिनिक, डॉक्टर, तारीख, समय, टोकन) और अगर आप लिखें तो कारण।' },
  { h: 'Why', hHi: 'क्यों',
    p: 'Only to book your visit, give you a queue token, remind you, and let the clinic call you about your appointment.',
    pHi: 'सिर्फ आपकी विज़िट बुक करने, कतार का टोकन देने, याद दिलाने और अपॉइंटमेंट के बारे में क्लिनिक से कॉल करने के लिए।' },
  { h: 'Who can see it', hHi: 'कौन देख सकता है',
    p: 'You see only your own bookings. The clinic you book with (its staff and doctor) sees the bookings made at that clinic. Other patients and other clinics cannot see your details.',
    pHi: 'आप सिर्फ अपनी बुकिंग देखते हैं। जिस क्लिनिक में आप बुक करते हैं उसका स्टाफ और डॉक्टर उसी क्लिनिक की बुकिंग देख सकते हैं। दूसरे मरीज़ और दूसरे क्लिनिक आपकी जानकारी नहीं देख सकते।' },
  { h: 'Where it is kept', hHi: 'कहाँ सुरक्षित है',
    p: 'On Google Firebase servers. The mobile number is verified with a one-time password (OTP).',
    pHi: 'Google Firebase सर्वर पर। मोबाइल नंबर वन-टाइम पासवर्ड (OTP) से सत्यापित होता है।' },
  { h: 'Your choices', hHi: 'आपके विकल्प',
    p: 'You can correct your details in Profile. To ask for your data to be deleted, contact the clinic reception. We do not sell your data and do not send marketing messages.',
    pHi: 'आप प्रोफ़ाइल में अपनी जानकारी सुधार सकते हैं। अपनी जानकारी हटवाने के लिए क्लिनिक रिसेप्शन से संपर्क करें। हम आपका डेटा बेचते नहीं और प्रचार संदेश नहीं भेजते।' },
];
