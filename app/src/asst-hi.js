/* ---------- assistant, Hindi side: answers about the app, and understanding Hindi / Hinglish commands ---------- */
const KB_HI=[
/*0 log*/'पढ़ाई का समय दर्ज करने के लिए किसी ब्लॉक पर **समय दर्ज करें** दबाएँ, या आज टैब पर **एक अतिरिक्त सत्र दर्ज करें** दबाएँ। मिनट, शुरू करने का समय, विषय, हल की गई अभ्यास शीट, और चाहें तो सामग्री और पूरे किए पेज भरें। आप मुझसे भी कह सकते हैं, जैसे "मैंने आज 90 मिनट प्रायिकता पढ़ी"।',
/*1 timer*/'टाइमर चलाने के लिए किसी ब्लॉक पर **शुरू करें** (या आज टैब पर "अभी शुरू करें") दबाएँ। पूरा होने पर **रोकें और दर्ज करें** दबाएँ और ब्योरा जाँच लें। चलता हुआ टाइमर दूसरी स्क्रीन पर टैब के ऊपर एक पट्टी में दिखता है।',
/*2 alarm*/'हर ब्लॉक की शुरुआत पर (सेटिंग्स में तय किए कुछ मिनट पहले) अलार्म स्क्रीन पर बजता है। ऊपर की घंटी के आइकन से इन्हें चालू करें। ये सिर्फ़ तब बजते हैं जब यह पेज खुला हो, क्योंकि वेब पेज अपने-आप आपका फ़ोन नहीं जगा सकता। पेज बंद होने पर भी चलने वाले अलार्म के लिए सेटिंग्स से समय-सारणी एक्सपोर्ट करके Google कैलेंडर में इम्पोर्ट करें।',
/*3 not ringing*/'अगर अलार्म नहीं बजा: जाँचें कि घंटी का आइकन चालू है, पेज खुला था और आवाज़ बंद नहीं है। ब्राउज़र पेज पर कुछ छूने के बाद ही आवाज़ चलने देते हैं, इसलिए ऐप खोलने के बाद घंटी एक बार दबा दें। स्क्रीन चालू रहना मदद करता है; अलार्म चालू होने पर ऐप इसके लिए कहता है।',
/*4 blocks*/'आपकी साप्ताहिक समय-सारणी ब्लॉक से बनी है। **योजना** टैब खोलें, कोई दिन चुनें और **ब्लॉक जोड़ें** दबाएँ। दिन, शुरू का समय, मिनट, विषय और प्रकार चुनें, और तय करें कि अलार्म बजे या नहीं। बदलने या हटाने के लिए किसी भी ब्लॉक को दबाएँ। आप मुझसे भी ब्लॉक जोड़ने या पूरी नई समय-सारणी बनाने को कह सकते हैं।',
/*5 subjects*/'हर विषय का एक **महत्व** होता है (कितने अंक आते हैं) और एक **आत्मविश्वास** (आप कितना मज़बूत महसूस करते हैं, 5 यानी मज़बूत)। प्लानर महत्वपूर्ण और कमज़ोर विषयों को पहले रखता है। इन्हें योजना टैब में विषय के नीचे बदलें।',
/*6 materials*/'**सामग्री** टैब में किताबें, नोट्स, अभ्यास शीट या मॉक पेपर जोड़ें, साथ में कितने पेज या सवाल हैं यह भी। प्रगति +बटन से या सत्र दर्ज करते समय अपडेट करें। "सुझाया गया क्रम" उन्हें इस आधार पर सजाता है कि आगे क्या पढ़ना है।',
/*7 study next*/'"आगे क्या पढ़ें" का क्रम इस पर तय होता है: विषय कितना ज़रूरी है, उसमें आप कितने अनिश्चित हैं, सामग्री कितनी बाक़ी है, और क्या पहले आना चाहिए (अभ्यास शीट से पहले थ्योरी)। परीक्षा 45 दिन से कम दूर होने पर मॉक पेपर ऊपर आ जाते हैं।',
/*8 report*/'साप्ताहिक रिपोर्ट का स्कोर आधा **योजना के मुक़ाबले पढ़े घंटों** से बनता है, चौथाई **हल की गई अभ्यास शीट** से, और चौथाई **तय समय के 30 मिनट के अंदर शुरू करने** से। यह रोज़ के घंटे, विषय के अनुसार, दिन का समय, और क्या बदलें इसके सुझाव भी दिखाती है।',
/*9 overlap*/'अगर एक ही कोर्स के दो सत्र समय में एक-दूसरे पर चढ़ते हैं (जैसे एक ही घंटा फ़ोन और लैपटॉप दोनों पर दर्ज हुआ), तो वह समय सिर्फ़ एक बार गिना जाता है। अलग-अलग कोर्स के सत्र कभी नहीं मिलाए जाते। रिपोर्ट बताती है कि कितना समय एक बार गिना गया।',
/*10 sync*/'Google से साइन इन करें (ऊपर दाएँ खाता बटन), तो आपकी योजना, सामग्री और लॉग फ़ोन, टैबलेट और लैपटॉप पर साथ-साथ सिंक होते हैं। साइन इन के बिना डेटा सिर्फ़ इसी डिवाइस पर रहता है।',
/*11 courses*/'हर कोर्स की अपनी योजना, सामग्री और लॉग होते हैं। साइन इन होने पर कोर्स बदलने या नया बनाने के लिए खाता शीट खोलें, या मुझसे कहें।',
/*12 install*/'इंस्टॉल करने के लिए: Chrome या Edge में एड्रेस बार का इंस्टॉल आइकन या ब्राउज़र मेन्यू, फिर Install app। iPhone पर Safari में Share, फिर Add to Home Screen। आज टैब पर भी एक इंस्टॉल कार्ड है।',
/*13 offline*/'पहली बार खोलने के बाद ऐप ऑफ़लाइन भी खुलता है। साइन इन होने पर ऑफ़लाइन किए बदलाव आपके डिवाइस पर सहेजे जाते हैं और दोबारा जुड़ने पर सिंक हो जाते हैं।',
/*14 backup*/'सेटिंग्स में Google कैलेंडर के लिए **समय-सारणी एक्सपोर्ट (CSV)** और **बैकअप डाउनलोड (JSON)** है। खाता शीट से आपका पूरा डेटा एक्सपोर्ट और बैकअप इम्पोर्ट हो सकता है, पुराने वर्ज़न से डेटा लाने का तरीक़ा भी यही है।',
/*15 privacy*/'आपका डेटा आपके अपने खाते में रहता है और सिर्फ़ आप उसे पढ़ सकते हैं। एक कोर्स साझा करने वाले लोग एक-दूसरे के पढ़ाई के मिनट देख सकते हैं, पर पढ़ने की प्रगति निजी रहती है। डेटा ट्रांज़िट और स्टोरेज में एन्क्रिप्टेड है, पर एंड-टू-एंड एन्क्रिप्टेड नहीं। खाता शीट से सब कुछ एक्सपोर्ट या हटाया जा सकता है।',
/*16 delete*/'खाता शीट खोलें और **यह कोर्स और मेरा डेटा हटाएँ** दबाएँ, इससे कोर्स और उसकी हर चीज़ हट जाएगी। साइन आउट करने से इस डिवाइस की स्थानीय कॉपी साफ़ हो जाती है।',
/*17 exam*/'परीक्षा का नाम और तारीख़ **सेटिंग्स** में तय करें (योजना टैब, फिर "परीक्षा की तारीख़, दिखावट, एक्सपोर्ट")। उलटी गिनती ऐप के ऊपर दिखती है। आप मुझे तारीख़ बता भी सकते हैं।',
/*18 tests*/'टेस्ट और मॉक टेस्ट **योजना, टेस्ट और मॉक टेस्ट** में जोड़ें, या मुझसे कहें, जैसे "रविवार को सुबह 10 बजे 3 घंटे का मॉक टेस्ट तय करो"। शुरू होने पर टेस्ट का टाइमर चलाएँ, रोकने पर मैं आपका स्कोर {पूछूँगा|पूछूँगी}। स्कोर रिपोर्ट टैब में ट्रेंड के साथ दिखते हैं।',
/*19 reminders*/'रिमाइंडर **योजना, रिमाइंडर और अलार्म** में जोड़ें, या मुझसे कहें, जैसे "कल शाम 6 बजे ML दोहराने की याद दिलाओ" या "रोज़ रात 9 बजे घंटे दर्ज करने की याद दिलाओ"। अलार्म की तरह ये भी पेज खुला रहने पर बजते हैं।',
/*20 theme*/'मुझसे कहें, जैसे "डार्क मोड", "मुख्य रंग हरा करो" या "बैकग्राउंड मिंट करो"। सेटिंग्स में भी चुन सकते हैं। पहले जैसा करने के लिए "लुक रीसेट करो" कहें।',
/*21 voice*/'मुझसे बात करने के लिए इस चैट में माइक्रोफ़ोन दबाएँ, मैं ज़ोर से जवाब {दूँगा|दूँगी}। स्लाइडर वाले आइकन में महिला (अनु) या पुरुष (आदि) आवाज़, गति और भाषा चुनें। आवाज़ पहचानना आपके ब्राउज़र पर निर्भर है (Chrome या Edge सबसे अच्छे चलते हैं)।',
/*22 smart*/'आम अनुरोध मैं बिना API key और बिना ख़र्च के ख़ुद समझ {लेता|लेती} हूँ। खुले सवालों और अनुरोधों के लिए सहायक की सेटिंग्स में अपनी AI की चिपकाकर **स्मार्ट मोड** चालू कर सकते हैं (Google Gemini की मुफ़्त की चलती है)। की इसी डिवाइस पर रहती है।',
/*23 android*/'वेब पेज यह नहीं देख सकता कि आप दूसरे कौन-से ऐप चलाते हैं। एक अलग Android साथी ऐप आपके चुने पढ़ाई वाले ऐप में बिताया समय मापता है और JSON फ़ाइल एक्सपोर्ट करता है। **योजना, पढ़ाई के टूल और अनुमतियाँ** में वह फ़ाइल इंपोर्ट करें और समय आपके लॉग में जुड़ जाएगा।',
/*24 study tools*/'जिन ऐप, साइट और YouTube चैनल से आप पढ़ते हैं उन्हें **योजना, पढ़ाई के टूल और अनुमतियाँ** में जोड़ें (सेटअप भी पूछता है)। ट्रैकिंग एक बार चालू करें। उसके बाद आज स्क्रीन से कोई टूल खोलने पर टाइमर चलता है और लौटने तक का समय बिना कुछ पूछे दर्ज हो जाता है। वेब पेज दूसरे ऐप के अंदर नहीं देख सकता, सिर्फ़ यह कि आप गए और लौटे। जिन ऐप को आप खुद खोलते हैं उनका समय Android साथी फ़ाइल से आता है। लैपटॉप पर Abhyashify ब्राउज़र एक्सटेंशन (प्रोजेक्ट के extension फ़ोल्डर में) आपकी पढ़ाई की साइटों पर समय गिनकर उसे अपने-आप यहाँ भेज देता है।',
/*25 setup*/'"मेरा कोर्स सेट करो" कहें या **मेरा कोर्स सेट करें** दबाएँ (पहला पेज, या दोबारा करने के लिए सेटिंग्स)। आप परीक्षा और उसका पेपर या शाखा चुनते हैं, वैकल्पिक विषय चुनते हैं, एक बार नोटिफ़िकेशन आदि की अनुमति देते हैं, पढ़ाई के टूल बताते हैं, परीक्षा या लक्ष्य की तारीख़ पक्की करते हैं, बताते हैं कितने घंटे और दिन का कौन-सा समय ठीक है, और उस तारीख़ तक का दिन-दर-दिन टाइम-टेबल पाते हैं। उसे जैसा है वैसा अपना सकते हैं या कोई भी ब्लॉक बदल सकते हैं।',
/*26 permissions*/'सेटअप एक बार नोटिफ़िकेशन, ब्राउज़र द्वारा सँभाला जाने वाला स्टोरेज, माइक्रोफ़ोन और टूल ट्रैकिंग की अनुमति माँगता है। उन्हें **योजना, पढ़ाई के टूल और अनुमतियाँ** में देख और बदल सकते हैं। नोटिफ़िकेशन तभी दिख सकते हैं जब ब्राउज़र इस पेज को ज़िंदा रखे। लॉक फ़ोन पर भरोसेमंद अलार्म के लिए सेटिंग्स का कैलेंडर एक्सपोर्ट इस्तेमाल करें।',
/*24 about*/'Abhyashify प्रतियोगी और बोर्ड परीक्षाओं (JEE, NEET, GATE, UPSC, SSC, NDA, CDS, CAT, CLAT, CA और अन्य, या आपकी अपनी) के लिए एक पढ़ाई का प्लानर है। यह आपकी साप्ताहिक समय-सारणी बनाता है, अलार्म बजाता है, पढ़ाई का समय दर्ज करता है, सामग्री और टेस्ट का हिसाब रखता है, और हफ़्ते की रिपोर्ट देता है जो आपके किए की योजना से तुलना करती है।',
/*25 signout*/'खाता शीट (ऊपर दाएँ) खोलें और **साइन आउट** दबाएँ। इससे इस डिवाइस की स्थानीय कॉपी भी साफ़ हो जाती है।'
];

/* ---------- understanding Hindi and Hinglish: turn it into the plain English the parser already knows ---------- */
const nk=s=>String(s).normalize('NFD').replace(/़/g,'').normalize('NFC');   // drop the nukta dot so ज़/ज and फ़/फ match
const HI_MONTHS0={'जनवरी':'jan','फरवरी':'feb','मार्च':'mar','अप्रैल':'apr','मई':'may','जून':'jun','जुलाई':'jul','अगस्त':'aug','सितंबर':'sep','सितम्बर':'sep','अक्टूबर':'oct','अक्तूबर':'oct','नवंबर':'nov','नवम्बर':'nov','दिसंबर':'dec','दिसम्बर':'dec',
 'january':'jan','farvari':'feb','janvari':'jan','agast':'aug','sitambar':'sep','sitamber':'sep','aktubar':'oct','navambar':'nov','disambar':'dec'};
const HI_MONTHS={};for(const k of Object.keys(HI_MONTHS0))HI_MONTHS[nk(k)]=HI_MONTHS0[k];
const HI_WORDS=nkMap({
 /* days */
 'आज':'today','आज रात':'tonight','कल':'tomorrow','परसों':'day after tomorrow','बीते कल':'yesterday','गुज़रे कल':'yesterday','अगले':'next','इस':'this',
 'सोमवार':'monday','मंगलवार':'tuesday','बुधवार':'wednesday','गुरुवार':'thursday','बृहस्पतिवार':'thursday','वीरवार':'thursday','शुक्रवार':'friday','शनिवार':'saturday','रविवार':'sunday','इतवार':'sunday',
 'हर रोज़':'every day','रोज़':'every day','रोज':'every day','रोजाना':'every day','प्रतिदिन':'every day','हर दिन':'every day','हर हफ्ते':'every week','हर सप्ताह':'every week','हर कार्यदिवस':'every weekday','सोमवार से शुक्रवार':'monday to friday',
 'हफ्ते':'week','हफ़्ते':'week','सप्ताह':'week','महीने':'month','पिछले हफ्ते':'last week','इस हफ्ते':'this week','इस महीने':'this month',
 /* things */
 'अलार्म':'alarm','एलार्म':'alarm','रिमाइंडर':'reminder','टेस्ट':'test','टैस्ट':'test','मॉक':'mock','मोक':'mock','परीक्षा की तारीख':'exam date','परीक्षा':'exam','एग्जाम':'exam','एग्ज़ाम':'exam','गेट':'gate',
 'स्कोर':'score','अंक':'marks','नंबर':'marks','टाइमर':'timer','स्टॉपवॉच':'timer','सत्र':'session','सेशन':'session','ब्लॉक':'block','विषय':'subject','सब्जेक्ट':'subject','सामग्री':'material','मैटेरियल':'material','किताब':'book','नोट्स':'notes','शीट':'sheet','कोर्स':'course','पाठ्यक्रम':'course',
 'समय सारणी':'schedule','समयसारणी':'schedule','टाइम टेबल':'schedule','टाइमटेबल':'schedule','शेड्यूल':'schedule','रूटीन':'routine','योजना':'plan','प्लान':'plan','सेटिंग्स':'settings','सेटिंग':'settings','रिपोर्ट':'report','खाता':'account','अकाउंट':'account',
 'डार्क मोड':'dark mode','डार्क':'dark','नाइट मोड':'dark mode','गहरा मोड':'dark mode','लाइट मोड':'light mode','हल्का मोड':'light mode','उजला मोड':'light mode','लाइट':'light','मोड':'mode','थीम':'theme','रंग':'colour','कलर':'colour','मुख्य रंग':'accent colour','एक्सेंट':'accent','बैकग्राउंड':'background','पृष्ठभूमि':'background','वॉलपेपर':'wallpaper','लुक':'look','रीसेट':'reset','डिफ़ॉल्ट':'default','डिफॉल्ट':'default','पहले जैसा':'default',
 'हरा':'green','हरे':'green','हरी':'green','नीला':'blue','नीले':'blue','नीली':'blue','लाल':'red','पीला':'yellow','पीले':'yellow','नारंगी':'orange','ऑरेंज':'orange','संतरी':'orange','गुलाबी':'pink','बैंगनी':'purple','जामुनी':'violet','पर्पल':'purple','भूरा':'brown','सफेद':'white','काला':'black','काले':'black','काली':'black','आसमानी':'sky','पुदीना':'mint','मिंट':'mint','अरोरा':'aurora','सूर्योदय':'sunrise','आधी रात':'midnight','मिडनाइट':'midnight','स्लेट':'slate','लैवेंडर':'lavender','क्रीम':'cream','टील':'teal','इंडिगो':'indigo','गुलाबी-सी':'blush','ब्लश':'blush','पेपर':'paper',
 /* subjects */
 'प्रायिकता':'probability','प्रोबेबिलिटी':'probability','सांख्यिकी':'statistics','स्टैटिस्टिक्स':'statistics','रैखिक बीजगणित':'linear algebra','लीनियर अलजेब्रा':'linear algebra','लीनियर एल्जेब्रा':'linear algebra','कैलकुलस':'calculus','ऑप्टिमाइज़ेशन':'optimization','ऑप्टिमाइजेशन':'optimization','पायथन':'python','डेटाबेस':'databases','मशीन लर्निंग':'machine learning','आर्टिफिशियल इंटेलिजेंस':'artificial intelligence','अभिक्षमता':'aptitude','एप्टीट्यूड':'aptitude','रिवीजन':'revision','थ्योरी':'theory','प्रैक्टिस':'practice','अभ्यास':'practice',
 /* verbs and glue (stems end with *) */
 'लगा*':'set','सेट*':'set','तय*':'set','रख*':'set','जोड़*':'add','जोड*':'add','बना*':'make','बदल*':'change','शुरू*':'start','शुरु*':'start','रोक*':'stop','बंद*':'stop','खत्म*':'stop','हटा*':'delete','मिटा*':'delete','डिलीट*':'delete','रद्द*':'cancel','खोल*':'open','दिखा*':'show','चालू*':'on','ऑन':'on','ऑफ':'off',
 'करो':'make','कर दो':'make','कीजिए':'make','कीजिये':'make','कर दीजिए':'make','कर दीजिये':'make','करिए':'make','करें':'make','करना':'make','कर दें':'make','कर':'',
 'भाषा':'language','अंग्रेज़ी':'english','अंग्रेजी':'english','इंग्लिश':'english','हिंदी':'hindi','हिन्दी':'hindi','सब':'all','सारे':'all','सारी':'all','सभी':'all','sab':'all','sabhi':'all','saare':'all','देना':'','दीजिए':'','दीजिये':'','दें':'','dena':'','dijiye':'','के लिए':'for','के बाद':'after','और':'and','मेरा':'my','मेरी':'my','मेरे':'my','मुझे':'','मैंने':'i','मैं':'i','कृपया':'','प्लीज़':'','प्लीज':'','जी':'','ज़रा':'','जरा':'',
 'पढ़ी':'studied','पढ़ा':'studied','पढ़े':'studied','पढी':'studied','पढा':'studied','पढे':'studied','पढ़ाई':'study','पढ़ना':'study','पढ़ने':'study','पढ़ूँ':'study','पढूं':'study','पढ़ूं':'study','पढ़ें':'study',
 'ओवरलैप':'overlap','सिंक':'sync','इंस्टॉल':'install','बैकअप':'backup','ऑफलाइन':'offline','प्राइवेसी':'privacy','निजी':'private','सुरक्षित':'secure','आवाज':'voice','माइक':'mic','असिस्टेंट':'assistant','सहायक':'assistant','एंड्रॉइड':'android','डिवाइस':'devices','लैपटॉप':'laptop','फोन':'phone','टैबलेट':'tablet','गूगल':'google','साइन आउट':'sign out','साइन इन':'sign','लॉगिन':'login','प्राथमिकता':'importance','महत्व':'importance','आत्मविश्वास':'confidence','बज*':'ring','नहीं':'not','बैटरी':'battery','डेटा':'data',
 'की':'','का':'','के':'','को':'','है':'','हैं':'','से':'','पर':'','ने':'','तो':'','भी':'','ही':'','वाला':'','वाली':'','वाले':'','होता':'','होती':'','ki':'','ka':'','ke':'','ko':'','hai':'','hain':'','wala':'','wali':'','wale':'',
 'कैसे':'how','क्यों':'why','क्या':'what','कब':'when','कितने':'how many','कितना':'how many','कितनी':'how many','कौन सा':'which','कौन-सा':'which','कौन सी':'which','बाकी':'left','बचे':'left','बचा':'left','बची':'left',
 /* Hinglish */
 'kal':'tomorrow','aaj':'today','aaj raat':'tonight','parso':'day after tomorrow','somvar':'monday','mangalvar':'tuesday','budhvar':'wednesday','guruvar':'thursday','veervar':'thursday','shukravar':'friday','shanivar':'saturday','ravivar':'sunday','itvar':'sunday',
 'roz':'every day','roj':'every day','rozana':'every day','har din':'every day','har hafte':'every week','agle':'next','is':'this',
 'ghante':'hours','ghanta':'hours','ghantey':'hours','ghanta':'hours','minute':'minutes','minat':'minutes','ank':'marks',
 'yaad dilana':'remind me','yaad dilao':'remind me','yaad dila do':'remind me','yaad dilaye':'remind me','jagana':'wake me up','jaga do':'wake me up','jaga dena':'wake me up',
 'laga do':'set','lagao':'set','laga':'set','lagana':'set','set karo':'set','set kar do':'set','rakho':'set','rakh do':'set','tay karo':'set','tay kar do':'set','banao':'make','bana do':'make','banana':'make','jodo':'add','jod do':'add','add karo':'add','badlo':'change','badal do':'change','badalna':'change',
 'shuru karo':'start','shuru kar do':'start','shuru':'start','band karo':'stop','band kar do':'stop','band':'stop','roko':'stop','hatao':'delete','mita do':'delete','delete karo':'delete','cancel karo':'cancel','khologe':'open','kholo':'open','dikhao':'show','batao':'tell','chalu karo':'on','chalu kar do':'on','chalu':'on','on karo':'on',
 'karo':'make','kar do':'make','kijiye':'make','kar dijiye':'make','kare':'make','kar':'',
 'mera':'my','meri':'my','mere':'my','mujhe':'','main':'i','maine':'i','ke liye':'for','ke baad':'after','aur':'and','please':'',
 'padha':'studied','padhi':'studied','padhe':'studied','padhai':'study','padhna':'study','padhu':'study','padhun':'study',
 'kaise':'how','kyun':'why','kyu':'why','kya':'what','kab':'when','kitne':'how many','kitna':'how many','kitni':'how many','kaun sa':'which','kaun si':'which','baaki':'left','bache':'left','bacha':'left','bachi':'left',
 'rang':'colour','hara':'green','neela':'blue','laal':'red','peela':'yellow','narangi':'orange','gulabi':'pink','baingani':'purple','bhura':'brown','safed':'white','kala':'black','aasmani':'sky',
 'samay sarani':'schedule','time table':'schedule','timetable':'schedule','yojana':'plan','vishay':'subject','kitab':'book','pariksha':'exam','pariksha ki tarikh':'exam date','tarikh':'date',
});
function nkMap(o){const m={};for(const k of Object.keys(o))m[nk(k).toLowerCase()]=o[k];return m}
const HI_STEMS=Object.keys(HI_WORDS).filter(k=>k.endsWith('*')).map(k=>[k.slice(0,-1),HI_WORDS[k]]).sort((a,b)=>b[0].length-a[0].length);
const HI_PHR=Object.keys(HI_WORDS).filter(k=>!k.endsWith('*'));
const HI_MAXN=Math.max.apply(null,HI_PHR.map(k=>k.split(' ').length));
const HI_YES=new Set(['हां','हाँ','हा','जी हां','जी हाँ','ठीक है','ठीक','ओके','सही','बिल्कुल','haan','han','ha','ji','ji haan','theek hai','theek','ok','okay','kar do']);
const HI_NO=new Set(['नहीं','नही','ना','नहीं नहीं','रहने दो','मत करो','nahi','nahin','na','rehne do','mat karo']);
function hiNorm(text){
  let s=String(text||'');
  const hasDev=/[ऀ-ॿ]/.test(s);
  const hing=/\b(mein|bolo|awaaz|chahiye|kal|aaj|subah|shaam|raat|dopahar|baje|yaad|dilao|dilana|laga|lagao|karo|batao|mujhe|mera|meri|ghante|ghanta|nahi|haan|kitne|kaise|kya|chalu|badlo|banao|jodo|roz|rang|shuru|roko|hatao|padha|padhu|dhanyavaad|shukriya|namaste)\b/i.test(s);
  if(!hasDev&&!hing)return s;
  s=nk(s).toLowerCase().replace(/[०-९]/g,d=>'०१२३४५६७८९'.indexOf(d)).replace(/[।॥]/g,'.').replace(/[?,!;]/g,' ').replace(/\s+/g,' ').trim();
  const flat=s.replace(/[.\s]+/g,' ').trim();
  // whole-message answers
  const first=flat.split(' ').slice(0,2).join(' ');
  if(HI_YES.has(flat)||HI_YES.has(flat.split(' ')[0]) && flat.split(' ').length<=3)return 'yes';
  if(HI_NO.has(flat)||HI_NO.has(flat.split(' ')[0]) && flat.split(' ').length<=3)return 'no';
  if(/(धन्यवाद|शुक्रिया|थैंक्स|थैंक यू|dhanyavaad|dhanyawad|shukriya|thanks)/.test(flat)&&flat.split(' ').length<=5)return 'thanks';
  if(/(कोर्स|परीक्षा|पाठ्यक्रम|एग्जाम).*(सेट ?अप|सेटअप|चुन)|(सेट ?अप|सेटअप).*(कोर्स|परीक्षा|एग्जाम)|(course|exam) (setup|set up|chuno|chunna)|(setup|set up) (my )?(course|exam)/.test(flat))return 'set up my course';
  if(/^(नमस्ते|नमस्कार|हैलो|हेलो|हाय|सुप्रभात|namaste|namaskar|hello|hi)(?=\s|$)/.test(flat)&&flat.split(' ').length<=3)return 'hello';
  if(/(पूर्ववत|अनडू|वापस (करो|कर दो|लो|ले लो)|पिछला (बदलाव|काम) (वापस|रद्द)|पिछला बदलाव|wapas karo|wapas kar do|undo)/.test(flat)&&flat.split(' ').length<=8)return 'undo';
  if(/(क्या क्या कर सकत|क्या कर सकत|मदद|सहायता|हेल्प|madad|kya kya kar sakte|kya kar sakte)/.test(flat)&&!/(अलार्म|टेस्ट|बनाओ)/.test(flat))return 'what can you do';
  // time and quantity phrases, before words are swapped
  const R=[
   [/(?:रोज|हर दिन|प्रतिदिन|roz|rozana|har din) (\d+(?:\.\d+)?) (?:घंटे|घंटा|घण्टे|ghante|ghanta)/g,'$1 hours a day'],
   [/(\d+(?:\.\d+)?) (?:घंटे|घंटा|घण्टे|ghante|ghanta) (?:रोज|रोजाना|हर दिन|roz|rozana)/g,'$1 hours a day'],
   [/(?:आगे|अब|आज) क्या (?:पढ़|पढ|करना|करूं|करूँ)\S*/g,'what should i study next'],[/क्या पढ़\S* चाहिए/g,'what should i study next'],[/(?:aage|ab|aaj) kya (?:padhu|padhun|padhna|karu)\S*/g,'what should i study next'],
   [/(?:परीक्षा|एग्जाम|pariksha|exam)\S* (?:में|mein|me)? ?कितने दिन (?:बचे|बाकी|बचा)\S*/g,'how many days left'],[/(?:pariksha|exam)\S* (?:mein|me) kitne din (?:bache|baaki)\S*/g,'how many days left'],
   [/(?:कितने|kitne) (?:घंटे|घण्टे|ghante) (?:पढ़|padh)\S*/g,'how many hours studied'],
   [/आधे घंटे/g,'30 minutes'],[/आधा घंटा/g,'30 minutes'],[/डेढ़ घंटे|डेढ घंटे|डेढ़ घंटा/g,'90 minutes'],[/ढाई घंटे|ढाई घंटा/g,'150 minutes'],[/adhe ghante|aadha ghanta/g,'30 minutes'],
   [/साढे (\d{1,2})/g,'$1:30'],[/सवा (\d{1,2})/g,'$1:15'],[/पौने (\d{1,2})/g,(m,n)=>((+n+10)%12+1)+':45'],[/डेढ़ बजे|डेढ बजे|der baje/g,'1:30'],[/ढाई बजे|dhai baje/g,'2:30'],
   [/(?:सुबह|सवेरे|भोर|subah|savere) (\d{1,2})(?::(\d\d))?(?: बजे| baje)?/g,(m,h,mi)=>h+(mi?':'+mi:'')+' am'],
   [/(\d{1,2})(?::(\d\d))?(?: बजे| baje) (?:सुबह|सवेरे|subah)/g,(m,h,mi)=>h+(mi?':'+mi:'')+' am'],
   [/(?:दोपहर|dopahar) (\d{1,2})(?::(\d\d))?(?: बजे| baje)?/g,(m,h,mi)=>h+(mi?':'+mi:'')+' pm'],
   [/(\d{1,2})(?::(\d\d))?(?: बजे| baje) (?:दोपहर|dopahar)/g,(m,h,mi)=>h+(mi?':'+mi:'')+' pm'],
   [/(?:शाम|shaam|sham) (\d{1,2})(?::(\d\d))?(?: बजे| baje)?/g,(m,h,mi)=>h+(mi?':'+mi:'')+' pm'],
   [/(\d{1,2})(?::(\d\d))?(?: बजे| baje) (?:शाम|shaam|sham)/g,(m,h,mi)=>h+(mi?':'+mi:'')+' pm'],
   [/(?:रात|raat) (\d{1,2})(?::(\d\d))?(?: बजे| baje)?/g,(m,h,mi)=>h+(mi?':'+mi:'')+(+h>=6&&+h<=11?' pm':+h===12||+h<=5?' am':' pm')],
   [/(\d{1,2})(?::(\d\d))?(?: बजे| baje) (?:रात|raat)/g,(m,h,mi)=>h+(mi?':'+mi:'')+(+h>=6&&+h<=11?' pm':+h===12||+h<=5?' am':' pm')],
   [/(\d{1,2})(:\d\d)? ?(?:बजे|baje)/g,'at $1$2'],
   [/(\d+) (?:मिनट|मिनिट|minute|minat|minutes|min) (?:में|बाद|के बाद|mein|me|baad|ke baad)/g,'in $1 minutes'],
   [/(\d+(?:\.\d+)?) (?:घंटे|घंटा|घण्टे|घण्टा|ghante|ghanta) (?:में|बाद|के बाद|mein|me|baad|ke baad)/g,'in $1 hours'],
   [/(\d+(?:\.\d+)?) (?:घंटे|घंटा|घण्टे|घण्टा|ghante|ghanta|ghantey)/g,'$1 hours'],
   [/(\d+) (?:मिनट|मिनिट|minat)/g,'$1 minutes'],
   [/(\d+) (?:में से|mein se|me se) (\d+)(?: (?:अंक|नंबर|ank))?(?: (?:मिले|मिला|आए|आये|आया|रहा|रहे|mile|mila|aaye|aaya))?/g,'scored $2 out of $1'],
   [/(\d+) (?:अंक|नंबर|ank)(?: (?:मिले|मिला|आए|आये|आया|रहा|रहे|mile|mila|aaye|aaya))/g,'scored $1'],
   [/स्कोर (\d+(?:\.\d+)?)(?: (?:रहा|है|था))?/g,'score was $1'],[/score (\d+)/g,'score was $1'],
   [/(\d+) (?:अंक|ank)/g,'$1 marks'],
   [/(?:अगले|agle) (सोमवार|मंगलवार|बुधवार|गुरुवार|शुक्रवार|शनिवार|रविवार|somvar|mangalvar|budhvar|guruvar|shukravar|shanivar|ravivar)/g,'next $1'],
   [/(\d{1,2}) (जनवरी|फरवरी|मार्च|अप्रैल|मई|जून|जुलाई|अगस्त|सितंबर|सितम्बर|अक्टूबर|अक्तूबर|नवंबर|नवम्बर|दिसंबर|दिसम्बर)/g,(m,d,mo)=>d+' '+HI_MONTHS[mo]],
   [/(जनवरी|फरवरी|मार्च|अप्रैल|मई|जून|जुलाई|अगस्त|सितंबर|सितम्बर|अक्टूबर|अक्तूबर|नवंबर|नवम्बर|दिसंबर|दिसम्बर) (\d{1,2})/g,(m,mo,d)=>HI_MONTHS[mo]+' '+d],
   [/(\d{1,2}) (janvari|farvari|march|april|may|june|july|agast|sitambar|sitamber|aktubar|navambar|disambar)/g,(m,d,mo)=>d+' '+(HI_MONTHS[mo]||mo)],
   [/(हिंदी|हिन्दी|hindi|हिंग्लिश) (?:में|mein|me)? ?(?:बोल|बात|जवाब|बताओ|bol|baat)\S*/g,'switch to hindi'],[/(अंग्रेज़ी|अंग्रेजी|इंग्लिश|english) (?:में|mein|me)? ?(?:बोल|बात|जवाब|बताओ|bol|baat)\S*/g,'switch to english'],
   [/आदि (?:से|की आवाज़|की आवाज|आवाज़|आवाज|जैसी)\S*|पुरुष (?:की )?आवाज\S*|मेल वॉइस|male awaaz|purush awaaz/g,'switch to male voice'],[/अनु (?:से|की आवाज़|की आवाज|आवाज़|आवाज|जैसी)\S*|महिला (?:की )?आवाज\S*|फीमेल वॉइस|female awaaz|mahila awaaz/g,'switch to female voice'],
   [/(?:मुझे )?(.+?) (?:की )?याद दिला\S*/g,'remind me $1'],[/याद दिला\S*/g,'remind me'],[/जगा\S*/g,'wake me up'],
  ];
  for(const [re0,rep] of R)s=s.replace(new RegExp(nk(re0.source),re0.flags),rep);
  // word by word, longest phrase first
  const keepLabelVerbs=/remind me/.test(s);
  const toks=s.split(' '),out=[];
  for(let i=0;i<toks.length;){
    let done=false;
    for(let n=Math.min(HI_MAXN,toks.length-i);n>=1&&!done;n--){
      const ph=toks.slice(i,i+n).join(' ');
      if(Object.prototype.hasOwnProperty.call(HI_WORDS,ph)&&!ph.endsWith('*')){out.push(HI_WORDS[ph]);i+=n;done=true}
    }
    if(done)continue;
    const w=toks[i];let hit=null;
    if(/[ऀ-ॿ]/.test(w))for(const [st,rep] of HI_STEMS){if(keepLabelVerbs&&/^(बना|रख|लगा|सेट|तय)/.test(st))continue;if(w.startsWith(st)){hit=rep;break}}
    out.push(hit!==null?hit:w);i++;
  }
  let r=out.join(' ').replace(/\s+/g,' ').trim();
  r=r.replace(/\b(start|stop|open|show|delete|cancel|add|change|tell) make$/,'$1');
  r=r.replace(/^(.+?) (show|tell|open|start|stop|delete|cancel)$/,(m,a,v)=>/^(show|tell|open|start|stop|delete|cancel|add|set|make|remind|i |my )?/.test(a)&&/^(show|tell|open|start|stop|delete|cancel)\b/.test(a)?m:v+' '+a);
  r=r.replace(/^subject add (.+)$/,'add subject $1').replace(/^(book|material|notes) add (.+)$/,'add $1 $2');
  return r;
}
