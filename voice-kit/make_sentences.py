#!/usr/bin/env python3
"""Writes the sentences a friend reads to record a voice for the assistant.
They cover what the assistant actually says (replies, times, days, numbers, subjects) plus ordinary speech, written as words
so the recording and the text match exactly. Hindi has masculine and feminine forms, so pick the speaker's: --gender male|female.
Usage: python3 voice-kit/make_sentences.py   (writes docs/voice-kit/sentences-*.txt)"""
import os, random, re, sys
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'docs', 'voice-kit')
os.makedirs(out, exist_ok=True)

def uniq(xs):
    seen, r = set(), []
    for x in xs:
        x = re.sub(r'\s+', ' ', x).strip()
        if x and x not in seen: seen.add(x); r.append(x)
    return r

def english(name):
    core = [
        f"Hello! I am {name}, your study assistant. This is how I sound.", "Okay.", "Done.", "Sure, I can do that.", "Good morning. Ready to study?", "Good evening. How did today go?",
        "You are welcome.", "Thank you.", "I did not understand that. Could you say it again?", "Which subject is it for?", "What time should I set it for?", "When should the test be?",
        "Your alarm is ringing.", "Your reminder.", "Time to start studying.", "Time is up. Take a short break.", "Your timer has started.", "Timer stopped.",
        "Undone. I put it back the way it was.", "I have changed the theme to dark mode.", "I have changed the theme to light mode.", "The accent colour is now green.", "The background is now midnight blue.",
        "You have no reminders or alarms set.", "You have no tests scheduled. Ask me to schedule one.", "I could not find a match for that.", "That reminder has been removed.", "All your alarms have been cleared.",
        "Your mock test has been scheduled.", "Your score has been saved.", "Great work today. Keep it up.", "You are a little behind the plan. Let us catch up tomorrow.", "You are ahead of the plan. Well done.",
        "Your exam is in a hundred and twenty days.", "Today you studied for two hours and thirty minutes.", "Your score this week is seventy two.", "You studied three hours of the four hours planned.",
        "I have added the subject to your plan.", "I have added a new study block.", "I have made a new weekly schedule for you.", "Do you want me to replace your current schedule?", "Please answer yes or no.",
        "Open the Plan tab to see your week.", "Open the Report tab to see how you are doing.", "Add your books and notes in the Materials tab.", "Tap the microphone to talk to me.", "I am listening.",
        "Alarms ring only while this page is open.", "Your data is saved on this device.", "You can export your plan at any time.", "Sign in with Google to sync your phone and laptop.", "Everything is saved and up to date.",
        "Revise the last chapter before you sleep.", "Solve ten practice questions on probability.", "Review your mistakes from the last mock test.", "Take a deep breath and start with the easiest topic.", "Drink some water and stretch for a minute.",
        "Linear algebra, probability, statistics and calculus are on your plan this week.", "Machine learning and databases come next.", "Python and data structures need more practice.", "Optimization is your weakest subject right now.", "Artificial intelligence is done for today.",
    ]
    nums = "zero one two three four five six seven eight nine ten eleven twelve".split()
    tens = {20: 'twenty', 30: 'thirty', 40: 'forty', 45: 'forty five', 50: 'fifty', 15: 'fifteen', 25: 'twenty five', 35: 'thirty five', 10: 'ten', 5: 'five'}
    days = ['today', 'tomorrow', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    times = ['six in the morning', 'seven thirty in the morning', 'nine in the morning', 'ten fifteen in the morning', 'noon', 'two in the afternoon', 'four thirty in the afternoon', 'six in the evening', 'seven forty five in the evening', 'nine in the evening', 'ten thirty at night', 'eleven at night', 'five fifteen in the morning', 'half past eight in the morning']
    subjects = ['probability', 'statistics', 'linear algebra', 'calculus', 'optimization', 'machine learning', 'databases', 'artificial intelligence', 'python', 'data structures', 'algorithms', 'aptitude', 'revision', 'the mock test', 'compiler design', 'operating systems']
    rnd = random.Random(7); gen = []
    for _ in range(55): gen.append(f"Alarm set for {rnd.choice(days)}, {rnd.choice(times)}.")
    for _ in range(30): gen.append(f"I will remind you to revise {rnd.choice(subjects)} on {rnd.choice(days)}, {rnd.choice(times)}.")
    for _ in range(30): gen.append(f"Test scheduled for {rnd.choice(days[2:])}, {rnd.choice(times)}, for {rnd.choice(['one hour', 'two hours', 'three hours', 'ninety minutes'])}.")
    for _ in range(16): gen.append(f"Your exam date is the {rnd.choice(['sixth', 'tenth', 'twelfth', 'twentieth', 'twenty first', 'twenty eighth'])} of {rnd.choice(months)}.")
    for s in subjects[:12]: gen.append(f"Study {s} for {rnd.choice(['thirty minutes', 'forty five minutes', 'one hour', 'one and a half hours', 'two hours'])} today.")
    for _ in range(20): a = rnd.choice([40, 52, 61, 68, 72, 75, 81, 85, 90]); gen.append(f"You scored {a} out of a hundred in {rnd.choice(subjects)}.")
    for _ in range(16): gen.append(f"{rnd.choice(subjects).capitalize()} is next on your plan for {rnd.choice(['thirty minutes', 'an hour', 'ninety minutes', 'two hours'])}.")
    for k in (5, 10, 15, 20, 25, 30, 45): gen.append(f"I will remind you in {tens[k]} minutes.")
    rich = [
        "The quick brown fox jumps over the lazy dog near the river bank.", "She sells sea shells by the sea shore, and the shells she sells are sea shells for sure.",
        "Preparation for a big exam is like a long journey; every small step matters.", "Please call Stella and ask her to bring these things with her from the store.",
        "When the sunlight strikes raindrops in the air, they act as a prism and form a rainbow.", "Would you like to take a short walk before we start the next lesson?",
        "The conference starts at nine, but registration opens an hour earlier.", "I think we should review the chapter on gradient descent once more.", "Can you explain why the variance of an estimator matters?",
        "A good night of sleep helps you remember what you studied during the day.", "Keep your phone away while you study, and take a break every fifty minutes.", "Consistency beats intensity when you prepare over many months.",
        "How many hours did you study yesterday, and how many are left for this week?", "Do not worry about one bad test; learn from it and move on.", "Let us begin with a quick revision of the formulas.",
        "Two plus two is four, and ten times ten is one hundred.", "The temperature is thirty four degrees and the sky is clear.", "Please send the report by Friday evening.", "He said he would arrive by noon, but the train was late.",
        "Where did you keep the notes that I gave you last week?", "Thank you so much for your help; it really made a difference.", "The library closes at eight, so plan to finish your practice sheet before that.",
    ]
    return uniq(core + gen + rich)

NUM_HI = "शून्य एक दो तीन चार पाँच छह सात आठ नौ दस ग्यारह बारह".split()
def hindi(name, g):
    def f(s):  # {masculine|feminine}
        return re.sub(r'\{([^|}]*)\|([^}]*)\}', lambda m: m.group(1) if g == 'male' else m.group(2), s)
    core = [
        f"नमस्ते! मैं {name} हूँ, आपकी पढ़ाई की सहायक। मेरी आवाज़ ऐसी है।".replace('सहायक।', 'सहायक।') if g == 'female' else f"नमस्ते! मैं {name} हूँ, आपकी पढ़ाई का सहायक। मेरी आवाज़ ऐसी है।",
        "ठीक है।", "हो गया।", "ज़रूर, मैं यह कर देता हूँ।" if g == 'male' else "ज़रूर, मैं यह कर देती हूँ।", "सुप्रभात। क्या पढ़ाई शुरू करें?", "शुभ संध्या। आज का दिन कैसा रहा?",
        "आपका स्वागत है।", "धन्यवाद।", "मैं यह समझ नहीं पाया। क्या आप दोबारा कह सकते हैं?" if g == 'male' else "मैं यह समझ नहीं पाई। क्या आप दोबारा कह सकते हैं?", "यह किस विषय के लिए है?", "किस समय के लिए लगाऊँ?", "टेस्ट कब रखना है?",
        "आपका अलार्म बज रहा है।", "आपका रिमाइंडर।", "पढ़ाई शुरू करने का समय हो गया।", "समय पूरा हुआ। थोड़ा आराम कर लें।", "आपका टाइमर शुरू हो गया।", "टाइमर रुक गया।",
        "वापस कर दिया। सब पहले जैसा है।", "मैंने गहरा मोड चालू कर दिया है।", "मैंने हल्का मोड चालू कर दिया है।", "मुख्य रंग अब हरा है।", "पृष्ठभूमि अब गहरी नीली है।",
        "आपका कोई रिमाइंडर या अलार्म सेट नहीं है।", "आपका कोई टेस्ट तय नहीं है। मुझसे एक तय करने को कहें।", "उसके लिए कोई मेल नहीं मिला।", "वह रिमाइंडर हटा दिया गया है।", "आपके सारे अलार्म हटा दिए गए हैं।",
        "आपका मॉक टेस्ट तय हो गया है।", "आपका स्कोर सहेज लिया गया है।", "आज बहुत अच्छा काम किया। ऐसे ही लगे रहिए।", "आप योजना से थोड़ा पीछे हैं। कल इसे पूरा कर लेंगे।", "आप योजना से आगे चल रहे हैं। शाबाश।",
        "आपकी परीक्षा में एक सौ बीस दिन बचे हैं।", "आज आपने दो घंटे तीस मिनट पढ़ाई की।", "इस हफ़्ते आपका स्कोर बहत्तर है।", "योजना के चार घंटों में से आपने तीन घंटे पढ़ा।",
        "मैंने यह विषय आपकी योजना में जोड़ दिया है।", "मैंने एक नया पढ़ाई का ब्लॉक जोड़ दिया है।", "मैंने आपके लिए नई साप्ताहिक समय-सारणी बना दी है।", "क्या आप चाहते हैं कि मैं अभी की समय-सारणी बदल दूँ?", "कृपया हाँ या नहीं में जवाब दें।",
        "अपना हफ़्ता देखने के लिए योजना टैब खोलें।", "आप कैसा कर रहे हैं, यह देखने के लिए रिपोर्ट टैब खोलें।", "अपनी किताबें और नोट्स सामग्री टैब में जोड़ें।", "मुझसे बात करने के लिए माइक्रोफ़ोन दबाएँ।", "मैं सुन रही हूँ।" if g == 'female' else "मैं सुन रहा हूँ।",
        "अलार्म सिर्फ़ तब बजते हैं जब यह पेज खुला हो।", "आपका डेटा इसी डिवाइस पर सेव है।", "आप कभी भी अपनी योजना एक्सपोर्ट कर सकते हैं।", "फ़ोन और लैपटॉप को सिंक करने के लिए गूगल से साइन इन करें।", "सब कुछ सेव है और नया है।",
        "सोने से पहले आख़िरी अध्याय दोहरा लें।", "प्रायिकता के दस अभ्यास प्रश्न हल करें।", "पिछले मॉक टेस्ट की ग़लतियाँ दोबारा देखें।", "गहरी साँस लें और सबसे आसान विषय से शुरू करें।", "थोड़ा पानी पिएँ और एक मिनट शरीर को खींचें।",
        "रैखिक बीजगणित, प्रायिकता, सांख्यिकी और कैलकुलस इस हफ़्ते की योजना में हैं।", "मशीन लर्निंग और डेटाबेस अगले हैं।", "पायथन और डेटा स्ट्रक्चर्स का और अभ्यास चाहिए।", "ऑप्टिमाइज़ेशन अभी आपका सबसे कमज़ोर विषय है।", "आर्टिफिशियल इंटेलिजेंस आज के लिए पूरा हो गया।",
    ]
    days = ['आज', 'कल', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार', 'रविवार']
    months = ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर']
    times = ['सुबह छह बजे', 'सुबह साढ़े सात बजे', 'सुबह नौ बजे', 'सुबह सवा दस बजे', 'दोपहर बारह बजे', 'दोपहर दो बजे', 'दोपहर साढ़े चार बजे', 'शाम छह बजे', 'शाम पौने आठ बजे', 'रात नौ बजे', 'रात साढ़े दस बजे', 'रात ग्यारह बजे', 'सुबह सवा पाँच बजे', 'सुबह साढ़े आठ बजे']
    subjects = ['प्रायिकता', 'सांख्यिकी', 'रैखिक बीजगणित', 'कैलकुलस', 'ऑप्टिमाइज़ेशन', 'मशीन लर्निंग', 'डेटाबेस', 'आर्टिफिशियल इंटेलिजेंस', 'पायथन', 'डेटा स्ट्रक्चर्स', 'एल्गोरिदम', 'अभिक्षमता', 'रिवीजन', 'मॉक टेस्ट', 'कंपाइलर डिज़ाइन', 'ऑपरेटिंग सिस्टम']
    durs = ['तीस मिनट', 'पैंतालीस मिनट', 'एक घंटा', 'डेढ़ घंटा', 'दो घंटे']
    rnd = random.Random(11); gen = []
    for _ in range(55): gen.append(f"{rnd.choice(days)} {rnd.choice(times)} के लिए अलार्म सेट हो गया।")
    for _ in range(30): gen.append(f"मैं आपको {rnd.choice(days)} {rnd.choice(times)} {rnd.choice(subjects)} दोहराने की याद दिलाऊँगा।" if g == 'male' else f"मैं आपको {rnd.choice(days)} {rnd.choice(times)} {rnd.choice(subjects)} दोहराने की याद दिलाऊँगी।")
    for _ in range(30): gen.append(f"टेस्ट {rnd.choice(days[2:])} {rnd.choice(times)} के लिए तय हुआ, {rnd.choice(['एक घंटे', 'दो घंटे', 'तीन घंटे', 'नब्बे मिनट'])} का।")
    for _ in range(16): gen.append(f"आपकी परीक्षा की तारीख {rnd.choice(['छह', 'दस', 'बारह', 'बीस', 'इक्कीस', 'अट्ठाईस'])} {rnd.choice(months)} है।")
    for s in subjects[:12]: gen.append(f"आज {s} को {rnd.choice(durs)} पढ़ें।")
    for _ in range(20): a = rnd.choice(['चालीस', 'बावन', 'इकसठ', 'अड़सठ', 'बहत्तर', 'पचहत्तर', 'इक्यासी', 'पचासी', 'नब्बे']); gen.append(f"{rnd.choice(subjects)} में आपको सौ में से {a} अंक मिले।")
    for _ in range(16): gen.append(f"आपकी योजना में अगला विषय {rnd.choice(subjects)} है, {rnd.choice(durs)} के लिए।")
    for k in ('पाँच', 'दस', 'पंद्रह', 'बीस', 'पच्चीस', 'तीस', 'पैंतालीस'): gen.append(f"मैं आपको {k} मिनट में याद दिलाऊँगा।" if g == 'male' else f"मैं आपको {k} मिनट में याद दिलाऊँगी।")
    rich = [
        "बड़ी परीक्षा की तैयारी एक लंबी यात्रा की तरह है; हर छोटा क़दम मायने रखता है।", "कृपया स्टेला को फ़ोन करके कहिए कि वह दुकान से ये चीज़ें अपने साथ ले आए।", "जब सूरज की रोशनी बारिश की बूँदों पर पड़ती है, तो इंद्रधनुष बनता है।",
        "क्या आप अगला पाठ शुरू करने से पहले थोड़ी देर टहलना चाहेंगे?", "सम्मेलन नौ बजे शुरू होता है, लेकिन पंजीकरण एक घंटा पहले खुल जाता है।", "मुझे लगता है कि हमें ग्रेडिएंट डिसेंट वाला अध्याय एक बार फिर दोहराना चाहिए।",
        "क्या आप समझा सकते हैं कि अनुमानक का प्रसरण क्यों मायने रखता है?", "अच्छी नींद से दिन में पढ़ी हुई बातें याद रखने में मदद मिलती है।", "पढ़ते समय फ़ोन दूर रखें और हर पचास मिनट बाद थोड़ा विराम लें।", "कई महीनों की तैयारी में लगातार मेहनत, तेज़ मेहनत से ज़्यादा काम आती है।",
        "कल आपने कितने घंटे पढ़ाई की, और इस हफ़्ते के कितने घंटे बाकी हैं?", "एक ख़राब टेस्ट की चिंता न करें; उससे सीखें और आगे बढ़ें।", "चलिए, सूत्रों के एक छोटे दोहराव से शुरू करते हैं।", "दो और दो चार होते हैं, और दस गुणा दस सौ।",
        "आज तापमान चौंतीस डिग्री है और आसमान साफ़ है।", "कृपया शुक्रवार शाम तक रिपोर्ट भेज दीजिए।", "उसने कहा था कि वह दोपहर तक पहुँच जाएगा, पर गाड़ी देर से आई।", "जो नोट्स मैंने पिछले हफ़्ते दिए थे, वे आपने कहाँ रखे हैं?",
        "आपकी मदद के लिए बहुत-बहुत धन्यवाद; इससे सच में बहुत फ़र्क़ पड़ा।", "पुस्तकालय आठ बजे बंद हो जाता है, इसलिए उससे पहले अपनी अभ्यास शीट पूरी कर लें।", "मेरा नाम आदि है और मेरी बहन का नाम अनु है।", "आज गुरुवार है और कल शुक्रवार होगा।",
    ]
    return uniq([f(x) for x in core + gen + rich])

if __name__ == '__main__':
    en_f, en_m = english('Anu'), english('Adi')
    files = {'sentences-en-female.txt': en_f, 'sentences-en-male.txt': en_m, 'sentences-hi-female.txt': hindi('अनु', 'female'), 'sentences-hi-male.txt': hindi('आदि', 'male')}
    for k, v in files.items():
        open(os.path.join(out, k), 'w', encoding='utf-8').write('\n'.join(v) + '\n'); print(k, len(v), 'sentences, about', round(sum(len(s.split()) for s in v) / 2.6 / 60), 'min')
