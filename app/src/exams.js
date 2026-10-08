
/* ---------- exam catalogue for the course-setup wizard ----------
   Every exam family has variants (GATE: CS, DA, ECE ...). A variant carries a preloaded subject list, optional
   groups the student picks from ("choose your optional subject"), and typical study hours and mock-test length.
   `when` and `wm` (months) only describe when the exam is *usually* held. They are a hint for the student to
   check against the official notice. The wizard never treats them as the real date.
   Subject strings: "English name|हिन्दी नाम|importance 1-5; ..." */
const SUBJ=str=>str.split(';').map(x=>x.trim()).filter(Boolean).map(x=>{const p=x.split('|');return {name:p[0].trim(),hi:(p[1]||'').trim(),w:Math.min(5,Math.max(1,+p[2]||3))}});
const OPTG=(q,qh,n,min,list)=>({q,qh,n,min,l:SUBJ(list)});
const VAR=(id,name,hi,when,wm,hrs,mk,subjects,opts)=>({id,name,hi,when,wm,hrs,mk,s:SUBJ(subjects),o:opts||[]});
const GA='General Aptitude|सामान्य अभिक्षमता|3';
const GATE_V=(id,name,hi,subjects,opts)=>VAR(id,name,hi,'Usually early February (some years late January). The dates change every year.',[2],[4,7],[180,100],subjects+';'+GA+';Revision & full mocks|रिवीज़न और पूरे मॉक|3',opts);
const SSB_OPT=OPTG('Also include these?','इन्हें भी जोड़ें?',2,0,'SSB interview preparation|एसएसबी इंटरव्यू की तैयारी|3;Physical fitness|शारीरिक फिटनेस|3');

const EXAMS=[
{id:'jee',name:'JEE',hi:'जेईई',d:'Engineering and architecture entrance',dh:'इंजीनियरिंग और आर्किटेक्चर प्रवेश परीक्षा',tools:'pw,unacad,khan,ncert,yt,drive,tg',v:[
 VAR('main','JEE Main (B.E. / B.Tech)','जेईई मेन (बी.ई. / बी.टेक)','Usually January and April sessions.',[1,4],[5,8],[180,300],
  'Physics|भौतिकी|4;Chemistry|रसायन विज्ञान|4;Mathematics|गणित|5;Revision & full mocks|रिवीज़न और पूरे मॉक|3'),
 VAR('adv','JEE Advanced','जेईई एडवांस्ड','Usually May or June, after JEE Main.',[5,6],[6,9],[180,360],
  'Physics|भौतिकी|5;Chemistry|रसायन विज्ञान|4;Mathematics|गणित|5;Revision & full mocks|रिवीज़न और पूरे मॉक|3'),
 VAR('both','JEE Main + Advanced','जेईई मेन + एडवांस्ड','Main usually January and April, Advanced May or June.',[1,4,5],[6,9],[180,300],
  'Physics|भौतिकी|5;Chemistry|रसायन विज्ञान|4;Mathematics|गणित|5;Revision & full mocks|रिवीज़न और पूरे मॉक|3'),
 VAR('arch','JEE Main Paper 2A (B.Arch)','जेईई मेन पेपर 2A (बी.आर्क)','Usually the January and April sessions.',[1,4],[3,5],[180,400],
  'Mathematics|गणित|4;Aptitude test (architecture)|एप्टीट्यूड टेस्ट (आर्किटेक्चर)|4;Drawing test|ड्रॉइंग टेस्ट|4;Revision & full mocks|रिवीज़न और पूरे मॉक|2'),
 VAR('plan','JEE Main Paper 2B (B.Planning)','जेईई मेन पेपर 2B (बी.प्लानिंग)','Usually the January and April sessions.',[1,4],[3,5],[180,400],
  'Mathematics|गणित|4;Aptitude test|एप्टीट्यूड टेस्ट|4;Planning-based questions|प्लानिंग आधारित प्रश्न|4;Revision & full mocks|रिवीज़न और पूरे मॉक|2'),
 VAR('aat','JEE Advanced + AAT (architecture)','जेईई एडवांस्ड + एएटी (आर्किटेक्चर)','Advanced usually May or June, the architecture test just after.',[5,6],[5,8],[180,360],
  'Physics|भौतिकी|4;Chemistry|रसायन विज्ञान|4;Mathematics|गणित|5;Architecture aptitude test (drawing, 3D perception)|आर्किटेक्चर एप्टीट्यूड टेस्ट (ड्रॉइंग, 3D समझ)|4;Revision & full mocks|रिवीज़न और पूरे मॉक|3')]},

{id:'neet',name:'NEET',hi:'नीट',d:'Medical entrance (UG and PG)',dh:'मेडिकल प्रवेश परीक्षा (UG और PG)',tools:'pw,unacad,khan,ncert,yt,drive,tg',v:[
 VAR('ug','NEET UG','नीट यूजी','Usually early May.',[5],[6,9],[180,720],
  'Physics|भौतिकी|4;Chemistry|रसायन विज्ञान|4;Botany|वनस्पति विज्ञान|5;Zoology|जंतु विज्ञान|5;Revision & full mocks|रिवीज़न और पूरे मॉक|3'),
 VAR('pg','NEET PG','नीट पीजी','The date changes a lot between years. In recent years it was in summer.',[],[4,7],[210,800],
  'Anatomy|एनाटॉमी|3;Physiology|फिजियोलॉजी|3;Biochemistry|बायोकैमिस्ट्री|3;Pathology|पैथोलॉजी|5;Pharmacology|फार्माकोलॉजी|4;Microbiology|माइक्रोबायोलॉजी|4;Forensic Medicine|फॉरेंसिक मेडिसिन|2;Community Medicine (PSM)|कम्युनिटी मेडिसिन (PSM)|4;Medicine|मेडिसिन|5;Surgery|सर्जरी|5;Obstetrics & Gynaecology|प्रसूति एवं स्त्री रोग|5;Paediatrics|बाल रोग|4;Orthopaedics|ऑर्थोपेडिक्स|2;ENT|ईएनटी|2;Ophthalmology|नेत्र रोग|2;Dermatology|त्वचा रोग|1;Psychiatry|मनोचिकित्सा|1;Anaesthesia|एनेस्थीसिया|2;Radiology|रेडियोलॉजी|2;Revision & full mocks|रिवीज़न और पूरे मॉक|3')]},

{id:'gate',name:'GATE',pf:'GATE',hi:'गेट',d:'Postgraduate engineering and science entrance (M.Tech, IISc, PSUs)',dh:'एम.टेक, IISc और PSU के लिए इंजीनियरिंग/विज्ञान परीक्षा',tools:'nptel,gato,yt,tb,pw,drive,tg',v:[
 GATE_V('cs','CS (Computer Science & IT)','सीएस (कंप्यूटर साइंस और आईटी)','Engineering Mathematics (discrete, linear algebra, calculus, probability)|इंजीनियरिंग गणित|4;Digital Logic|डिजिटल लॉजिक|3;Computer Organization & Architecture|कंप्यूटर संगठन और आर्किटेक्चर|4;Programming & Data Structures|प्रोग्रामिंग और डेटा स्ट्रक्चर|5;Algorithms|एल्गोरिदम|5;Theory of Computation|थ्योरी ऑफ कम्प्यूटेशन|4;Compiler Design|कंपाइलर डिज़ाइन|3;Operating Systems|ऑपरेटिंग सिस्टम|5;Databases|डेटाबेस|5;Computer Networks|कंप्यूटर नेटवर्क|4'),
 GATE_V('da','DA (Data Science & AI)','डीए (डेटा साइंस और एआई)','Probability & Statistics|प्रायिकता और सांख्यिकी|5;Linear Algebra|रैखिक बीजगणित|4;Calculus & Optimization|कैलकुलस और ऑप्टिमाइज़ेशन|3;Python Programming & DSA|पायथन प्रोग्रामिंग और DSA|3;Databases & Warehousing|डेटाबेस और वेयरहाउसिंग|2;Machine Learning|मशीन लर्निंग|5;Artificial Intelligence|आर्टिफिशियल इंटेलिजेंस|4'),
 GATE_V('ece','ECE (Electronics & Communication)','ईसीई (इलेक्ट्रॉनिक्स और संचार)','Engineering Mathematics|इंजीनियरिंग गणित|3;Networks, Signals & Systems|नेटवर्क, सिग्नल और सिस्टम|5;Electronic Devices|इलेक्ट्रॉनिक डिवाइस|3;Analog Circuits|एनालॉग सर्किट|4;Digital Circuits|डिजिटल सर्किट|4;Control Systems|कंट्रोल सिस्टम|3;Communications|संचार|4;Electromagnetics|विद्युत चुम्बकत्व|3'),
 GATE_V('ee','EE (Electrical)','ईई (इलेक्ट्रिकल)','Engineering Mathematics|इंजीनियरिंग गणित|3;Electric Circuits|विद्युत परिपथ|4;Electromagnetic Fields|विद्युत चुम्बकीय क्षेत्र|3;Signals & Systems|सिग्नल और सिस्टम|3;Electrical Machines|विद्युत मशीनें|5;Power Systems|पावर सिस्टम|5;Control Systems|कंट्रोल सिस्टम|4;Measurements|मापन|3;Analog & Digital Electronics|एनालॉग और डिजिटल इलेक्ट्रॉनिक्स|4;Power Electronics & Drives|पावर इलेक्ट्रॉनिक्स और ड्राइव|4'),
 GATE_V('me','ME (Mechanical)','एमई (मैकेनिकल)','Engineering Mathematics|इंजीनियरिंग गणित|3;Engineering Mechanics|इंजीनियरिंग मैकेनिक्स|3;Mechanics of Materials|पदार्थों की मैकेनिक्स|4;Theory of Machines & Vibrations|थ्योरी ऑफ मशीन और कंपन|4;Machine Design|मशीन डिज़ाइन|4;Fluid Mechanics & Machines|द्रव यांत्रिकी और मशीनें|5;Heat Transfer|ऊष्मा स्थानांतरण|4;Thermodynamics|ऊष्मागतिकी|5;Thermal applications (engines, turbines, refrigeration)|तापीय अनुप्रयोग (इंजन, टरबाइन, रेफ्रिजरेशन)|3;Materials, Manufacturing & Industrial Engineering|पदार्थ, विनिर्माण और औद्योगिक इंजीनियरिंग|5'),
 GATE_V('ce','CE (Civil)','सीई (सिविल)','Engineering Mathematics|इंजीनियरिंग गणित|3;Engineering Mechanics & Solid Mechanics|इंजीनियरिंग मैकेनिक्स और ठोस यांत्रिकी|4;Structural Analysis|संरचनात्मक विश्लेषण|4;Concrete & Steel Structures|कंक्रीट और स्टील संरचनाएँ|4;Construction Materials & Management|निर्माण सामग्री और प्रबंधन|2;Geotechnical Engineering|भू-तकनीकी इंजीनियरिंग|5;Fluid Mechanics & Hydrology|द्रव यांत्रिकी और जल विज्ञान|4;Environmental Engineering|पर्यावरण इंजीनियरिंग|4;Transportation Engineering|परिवहन इंजीनियरिंग|3;Geomatics (surveying)|जियोमैटिक्स (सर्वेक्षण)|2'),
 GATE_V('ch','CH (Chemical)','सीएच (केमिकल)','Engineering Mathematics|इंजीनियरिंग गणित|3;Process Calculations & Thermodynamics|प्रोसेस कैलकुलेशन और ऊष्मागतिकी|4;Fluid Mechanics & Mechanical Operations|द्रव यांत्रिकी और यांत्रिक संक्रियाएँ|4;Heat Transfer|ऊष्मा स्थानांतरण|4;Mass Transfer|द्रव्यमान स्थानांतरण|4;Chemical Reaction Engineering|रासायनिक अभिक्रिया इंजीनियरिंग|4;Instrumentation & Process Control|इंस्ट्रूमेंटेशन और प्रोसेस कंट्रोल|3;Plant Design & Economics|प्लांट डिज़ाइन और अर्थशास्त्र|2;Chemical Technology|रासायनिक प्रौद्योगिकी|2'),
 GATE_V('in','IN (Instrumentation)','आईएन (इंस्ट्रूमेंटेशन)','Engineering Mathematics|इंजीनियरिंग गणित|3;Electrical Circuits & Machines|विद्युत परिपथ और मशीनें|3;Signals & Systems|सिग्नल और सिस्टम|4;Control Systems|कंट्रोल सिस्टम|4;Analog & Digital Electronics|एनालॉग और डिजिटल इलेक्ट्रॉनिक्स|4;Measurements|मापन|5;Sensors & Industrial Instrumentation|सेंसर और औद्योगिक इंस्ट्रूमेंटेशन|4;Communication & Optical Instrumentation|संचार और ऑप्टिकल इंस्ट्रूमेंटेशन|3'),
 GATE_V('bt','BT (Biotechnology)','बीटी (बायोटेक्नोलॉजी)','Engineering Mathematics|इंजीनियरिंग गणित|2;General Biotechnology|सामान्य बायोटेक्नोलॉजी|4;Biochemistry|बायोकैमिस्ट्री|4;Molecular Biology & Genetics|आणविक जीव विज्ञान और आनुवंशिकी|5;Cell Biology|कोशिका विज्ञान|3;Microbiology|माइक्रोबायोलॉजी|3;Immunology|प्रतिरक्षा विज्ञान|3;Bioprocess Engineering|बायोप्रोसेस इंजीनियरिंग|4;Bioinformatics|बायोइन्फॉर्मेटिक्स|3'),
 GATE_V('pi','PI (Production & Industrial)','पीआई (प्रोडक्शन और इंडस्ट्रियल)','Engineering Mathematics|इंजीनियरिंग गणित|3;General Engineering (mechanics, materials, thermo)|सामान्य इंजीनियरिंग (मैकेनिक्स, पदार्थ, ऊष्मा)|3;Manufacturing Processes|विनिर्माण प्रक्रियाएँ|5;Metrology & Inspection|मेट्रोलॉजी और निरीक्षण|3;Machine Tools & Tool Engineering|मशीन टूल और टूल इंजीनियरिंग|4;Production Planning & Control|उत्पादन योजना और नियंत्रण|4;Operations Research|ऑपरेशन्स रिसर्च|4;Quality & Reliability|गुणवत्ता और विश्वसनीयता|3'),
 VAR('xe','XE (Engineering Sciences)','एक्सई (इंजीनियरिंग साइंसेज़)','Usually early February.',[2],[4,7],[180,100],
  'Engineering Mathematics|इंजीनियरिंग गणित|4;Fluid Mechanics|द्रव यांत्रिकी|3;'+GA+';Revision & full mocks|रिवीज़न और पूरे मॉक|3',
  [OPTG('Choose your two optional sections','अपने दो वैकल्पिक सेक्शन चुनें',2,2,'Materials Science|मटेरियल साइंस|4;Solid Mechanics|ठोस यांत्रिकी|4;Thermodynamics|ऊष्मागतिकी|4;Polymer Science & Engineering|पॉलीमर साइंस और इंजीनियरिंग|4;Food Technology|खाद्य प्रौद्योगिकी|4;Atmospheric & Oceanic Sciences|वायुमंडलीय और समुद्री विज्ञान|4')]),
 VAR('xl','XL (Life Sciences)','एक्सएल (लाइफ साइंसेज़)','Usually early February.',[2],[4,7],[180,100],
  'Chemistry|रसायन विज्ञान|4;'+GA+';Revision & full mocks|रिवीज़न और पूरे मॉक|3',
  [OPTG('Choose your two optional sections','अपने दो वैकल्पिक सेक्शन चुनें',2,2,'Biochemistry|बायोकैमिस्ट्री|4;Botany|वनस्पति विज्ञान|4;Microbiology|माइक्रोबायोलॉजी|4;Zoology|जंतु विज्ञान|4;Food Technology|खाद्य प्रौद्योगिकी|4')])]},

{id:'upsc',name:'UPSC',hi:'यूपीएससी',d:'Civil Services and engineering services',dh:'सिविल सेवा और इंजीनियरिंग सेवा',tools:'yt,unacad,ncert,drive,tg',v:[
 VAR('cse','Civil Services (IAS): Prelims + Mains','सिविल सेवा (IAS): प्रारंभिक + मुख्य','Prelims is usually late May or June, Mains about three months later.',[5,6],[6,9],[120,200],
  'Indian Polity & Governance|भारतीय राजव्यवस्था और शासन|5;History, Art & Culture|इतिहास, कला और संस्कृति|5;Geography|भूगोल|5;Indian Economy|भारतीय अर्थव्यवस्था|5;Environment & Ecology|पर्यावरण और पारिस्थितिकी|4;Science & Technology|विज्ञान और प्रौद्योगिकी|3;International Relations|अंतर्राष्ट्रीय संबंध|4;Internal Security & Disaster Management|आंतरिक सुरक्षा और आपदा प्रबंधन|3;Ethics, Integrity & Aptitude|नीतिशास्त्र, सत्यनिष्ठा और अभिक्षमता|4;Essay|निबंध|3;CSAT (aptitude, comprehension, reasoning)|सीसैट (अभिक्षमता, बोधगम्यता, तर्क)|3;Current Affairs|समसामयिकी|4;Answer writing practice|उत्तर लेखन अभ्यास|4',
  [OPTG('Choose your optional subject','अपना वैकल्पिक विषय चुनें',1,1,'Agriculture|कृषि|4;Animal Husbandry & Veterinary Science|पशुपालन एवं पशु चिकित्सा विज्ञान|4;Anthropology|मानवविज्ञान|4;Botany|वनस्पति विज्ञान|4;Chemistry|रसायन विज्ञान|4;Civil Engineering|सिविल इंजीनियरिंग|4;Commerce & Accountancy|वाणिज्य और लेखा|4;Economics|अर्थशास्त्र|4;Electrical Engineering|इलेक्ट्रिकल इंजीनियरिंग|4;Geography|भूगोल (वैकल्पिक)|4;Geology|भूविज्ञान|4;History|इतिहास (वैकल्पिक)|4;Law|विधि|4;Management|प्रबंधन|4;Mathematics|गणित|4;Mechanical Engineering|मैकेनिकल इंजीनियरिंग|4;Medical Science|चिकित्सा विज्ञान|4;Philosophy|दर्शनशास्त्र|4;Physics|भौतिकी|4;Political Science & International Relations|राजनीति विज्ञान और अंतर्राष्ट्रीय संबंध|4;Psychology|मनोविज्ञान|4;Public Administration|लोक प्रशासन|4;Sociology|समाजशास्त्र|4;Statistics|सांख्यिकी|4;Zoology|जंतु विज्ञान|4;Literature of a language|भाषा का साहित्य|4')]),
 VAR('pre','Civil Services (IAS): Prelims only','सिविल सेवा (IAS): केवल प्रारंभिक','Usually late May or June.',[5,6],[6,9],[120,200],
  'Indian Polity & Governance|भारतीय राजव्यवस्था और शासन|5;History, Art & Culture|इतिहास, कला और संस्कृति|5;Geography|भूगोल|5;Indian Economy|भारतीय अर्थव्यवस्था|5;Environment & Ecology|पर्यावरण और पारिस्थितिकी|4;Science & Technology|विज्ञान और प्रौद्योगिकी|3;CSAT (aptitude, comprehension, reasoning)|सीसैट (अभिक्षमता, बोधगम्यता, तर्क)|3;Current Affairs|समसामयिकी|4;Revision & full mocks|रिवीज़न और पूरे मॉक|3'),
 VAR('ese','Engineering Services (ESE / IES) Stage 1','इंजीनियरिंग सेवा (ESE / IES) चरण 1','The date changes every year. Check the UPSC notice.',[],[5,8],[120,200],
  'General Studies & Engineering Aptitude|सामान्य अध्ययन और इंजीनियरिंग अभिक्षमता|3;Revision & full mocks|रिवीज़न और पूरे मॉक|3',
  [OPTG('Choose your engineering branch','अपनी इंजीनियरिंग शाखा चुनें',1,1,'Civil Engineering (Paper I & II)|सिविल इंजीनियरिंग (पेपर I और II)|5;Mechanical Engineering (Paper I & II)|मैकेनिकल इंजीनियरिंग (पेपर I और II)|5;Electrical Engineering (Paper I & II)|इलेक्ट्रिकल इंजीनियरिंग (पेपर I और II)|5;Electronics & Telecommunication (Paper I & II)|इलेक्ट्रॉनिक्स और दूरसंचार (पेपर I और II)|5')])]},

{id:'ssc',name:'SSC',hi:'एसएससी',d:'Staff Selection Commission exams',dh:'कर्मचारी चयन आयोग की परीक्षाएँ',tools:'yt,unacad,tb,drive,tg',v:[
 VAR('cgl','SSC CGL','एसएससी सीजीएल','Dates change every year. Check the SSC calendar.',[],[4,7],[60,200],
  'Quantitative Aptitude|संख्यात्मक अभिक्षमता|5;General Intelligence & Reasoning|सामान्य बुद्धिमत्ता और तर्क|5;English Language|अंग्रेज़ी भाषा|5;General Awareness|सामान्य जागरूकता|4;Revision & full mocks|रिवीज़न और पूरे मॉक|3',
  [OPTG('Extra paper for some posts (Tier 2)','कुछ पदों के लिए अतिरिक्त पेपर (टियर 2)',1,0,'Statistics|सांख्यिकी|4;Finance & Economics|वित्त और अर्थशास्त्र|4')]),
 VAR('chsl','SSC CHSL','एसएससी सीएचएसएल','Dates change every year. Check the SSC calendar.',[],[3,6],[60,200],
  'Quantitative Aptitude|संख्यात्मक अभिक्षमता|4;General Intelligence & Reasoning|सामान्य बुद्धिमत्ता और तर्क|5;English Language|अंग्रेज़ी भाषा|5;General Awareness|सामान्य जागरूकता|4;Revision & full mocks|रिवीज़न और पूरे मॉक|3',
  [OPTG('Skill test','स्किल टेस्ट',1,0,'Typing practice|टाइपिंग अभ्यास|3')]),
 VAR('mts','SSC MTS','एसएससी एमटीएस','Dates change every year. Check the SSC calendar.',[],[3,5],[90,150],
  'Numerical & Mathematical Ability|संख्यात्मक और गणितीय योग्यता|4;Reasoning Ability & Problem Solving|तर्क क्षमता और समस्या समाधान|5;General English|सामान्य अंग्रेज़ी|4;General Awareness|सामान्य जागरूकता|4;Revision & full mocks|रिवीज़न और पूरे मॉक|2'),
 VAR('gd','SSC GD Constable','एसएससी जीडी कांस्टेबल','Dates change every year. Check the SSC calendar.',[],[3,5],[60,80],
  'General Knowledge & Awareness|सामान्य ज्ञान और जागरूकता|4;Elementary Mathematics|प्रारंभिक गणित|4;Reasoning|तर्कशक्ति|5;English / Hindi|अंग्रेज़ी / हिन्दी|4;Physical fitness (running, PET)|शारीरिक फिटनेस (दौड़, PET)|4;Revision & full mocks|रिवीज़न और पूरे मॉक|2'),
 VAR('cpo','SSC CPO (Sub-Inspector)','एसएससी सीपीओ (सब-इंस्पेक्टर)','Dates change every year. Check the SSC calendar.',[],[4,6],[120,200],
  'General Intelligence & Reasoning|सामान्य बुद्धिमत्ता और तर्क|5;General Knowledge & Awareness|सामान्य ज्ञान और जागरूकता|4;Quantitative Aptitude|संख्यात्मक अभिक्षमता|4;English Comprehension|अंग्रेज़ी बोधगम्यता|5;Physical fitness (PET / PST)|शारीरिक फिटनेस (PET / PST)|4;Revision & full mocks|रिवीज़न और पूरे मॉक|3')]},

{id:'nda',name:'NDA',hi:'एनडीए',d:'National Defence Academy and Naval Academy',dh:'राष्ट्रीय रक्षा अकादमी और नौसेना अकादमी',tools:'yt,unacad,ncert,drive,tg',v:[
 VAR('nda','NDA & NA written exam','एनडीए और एनए लिखित परीक्षा','Held twice a year, usually April and September.',[4,9],[5,8],[150,300],
  'Mathematics|गणित|5;English|अंग्रेज़ी|4;Physics|भौतिकी|3;Chemistry|रसायन विज्ञान|2;General Science (biology)|सामान्य विज्ञान (जीव विज्ञान)|2;History & Freedom Movement|इतिहास और स्वतंत्रता आंदोलन|2;Geography|भूगोल|2;Current Events|समसामयिक घटनाएँ|3;Revision & full mocks|रिवीज़न और पूरे मॉक|3',[SSB_OPT])]},

{id:'cds',name:'CDS',hi:'सीडीएस',d:'Combined Defence Services (officer entry)',dh:'संयुक्त रक्षा सेवा (अधिकारी प्रवेश)',tools:'yt,unacad,drive,tg',v:[
 VAR('ima','CDS: IMA / INA / AFA (3 papers)','सीडीएस: IMA / INA / AFA (3 पेपर)','Held twice a year, usually April and September.',[4,9],[4,7],[120,100],
  'English|अंग्रेज़ी|5;General Knowledge|सामान्य ज्ञान|4;Elementary Mathematics|प्रारंभिक गणित|4;Revision & full mocks|रिवीज़न और पूरे मॉक|3',[SSB_OPT]),
 VAR('ota','CDS: OTA (2 papers)','सीडीएस: OTA (2 पेपर)','Held twice a year, usually April and September.',[4,9],[3,6],[120,100],
  'English|अंग्रेज़ी|5;General Knowledge|सामान्य ज्ञान|5;Revision & full mocks|रिवीज़न और पूरे मॉक|3',[SSB_OPT])]},

{id:'cat',name:'CAT / MBA',hi:'कैट / एमबीए',d:'Management entrance exams',dh:'प्रबंधन प्रवेश परीक्षाएँ',tools:'yt,unacad,tb,drive,tg',v:[
 VAR('cat','CAT','कैट','Usually the last Sunday of November.',[11],[3,6],[120,198],
  'Quantitative Aptitude|संख्यात्मक अभिक्षमता|5;Data Interpretation & Logical Reasoning|डेटा इंटरप्रिटेशन और लॉजिकल रीज़निंग|5;Verbal Ability & Reading Comprehension|वर्बल एबिलिटी और रीडिंग कॉम्प्रिहेंशन|5;Revision & full mocks|रिवीज़न और पूरे मॉक|4'),
 VAR('xat','XAT','एक्सएटी','Usually early January.',[1],[3,6],[180,100],
  'Verbal & Logical Ability|वर्बल और लॉजिकल एबिलिटी|5;Decision Making|निर्णय क्षमता|4;Quantitative Ability & Data Interpretation|क्वांटिटेटिव एबिलिटी और डेटा इंटरप्रिटेशन|5;General Knowledge|सामान्य ज्ञान|3;Revision & full mocks|रिवीज़न और पूरे मॉक|4'),
 VAR('cmat','CMAT','सीमैट','Dates change every year. Check the NTA notice.',[],[3,5],[180,400],
  'Quantitative Techniques & Data Interpretation|क्वांटिटेटिव टेक्निक्स और डेटा इंटरप्रिटेशन|5;Logical Reasoning|लॉजिकल रीज़निंग|4;Language Comprehension|भाषा बोधगम्यता|4;General Awareness|सामान्य जागरूकता|3;Revision & full mocks|रिवीज़न और पूरे मॉक|3'),
 VAR('nmat','NMAT','एनमैट','Held in a window of several weeks. Check the official site.',[],[3,5],[120,120],
  'Language Skills|भाषा कौशल|4;Quantitative Skills|क्वांटिटेटिव स्किल्स|5;Logical Reasoning|लॉजिकल रीज़निंग|4;Revision & full mocks|रिवीज़न और पूरे मॉक|3'),
 VAR('ipmat','IPMAT (integrated MBA)','आईपीमैट (इंटीग्रेटेड एमबीए)','Usually around May.',[5],[3,6],[120,100],
  'Quantitative Ability|क्वांटिटेटिव एबिलिटी|5;Verbal Ability|वर्बल एबिलिटी|5;Revision & full mocks|रिवीज़न और पूरे मॉक|3')]},

{id:'clat',name:'CLAT / Law',hi:'क्लैट / विधि',d:'Law entrance exams',dh:'विधि प्रवेश परीक्षाएँ',tools:'yt,unacad,drive,tg',v:[
 VAR('ug','CLAT UG','क्लैट यूजी','Usually the first Sunday of December.',[12],[3,6],[120,120],
  'English Language|अंग्रेज़ी भाषा|4;Current Affairs & General Knowledge|समसामयिकी और सामान्य ज्ञान|5;Legal Reasoning|लीगल रीज़निंग|5;Logical Reasoning|लॉजिकल रीज़निंग|4;Quantitative Techniques|क्वांटिटेटिव टेक्निक्स|2;Revision & full mocks|रिवीज़न और पूरे मॉक|3'),
 VAR('pg','CLAT PG','क्लैट पीजी','Usually December.',[12],[3,6],[120,120],
  'Constitutional Law|संवैधानिक विधि|5;Jurisprudence|विधिशास्त्र|4;Administrative Law|प्रशासनिक विधि|3;Law of Contracts|संविदा विधि|4;Law of Torts|अपकृत्य विधि|4;Family Law|पारिवारिक विधि|3;Criminal Law|आपराधिक विधि|4;Property Law|संपत्ति विधि|3;Company Law|कंपनी विधि|3;Public International Law|लोक अंतर्राष्ट्रीय विधि|3;Environmental Law|पर्यावरण विधि|2;Intellectual Property Law|बौद्धिक संपदा विधि|2;Revision & full mocks|रिवीज़न और पूरे मॉक|3'),
 VAR('ailet','AILET (NLU Delhi)','एआईएलईटी (NLU दिल्ली)','Usually around December.',[12],[3,6],[90,150],
  'English|अंग्रेज़ी|4;General Knowledge & Current Affairs|सामान्य ज्ञान और समसामयिकी|5;Legal Aptitude|लीगल एप्टीट्यूड|5;Reasoning|तर्कशक्ति|4;Elementary Mathematics|प्रारंभिक गणित|2;Revision & full mocks|रिवीज़न और पूरे मॉक|3')]},

{id:'ca',name:'CA',hi:'सीए',d:'Chartered Accountancy (ICAI)',dh:'चार्टर्ड अकाउंटेंसी (ICAI)',tools:'yt,drive,tg',v:[
 VAR('fnd','CA Foundation','सीए फाउंडेशन','ICAI holds it more than once a year. Check the ICAI schedule.',[1,5,9],[4,7],[180,100],
  'Principles & Practice of Accounting|अकाउंटिंग के सिद्धांत और व्यवहार|5;Business Laws|व्यावसायिक विधि|4;Quantitative Aptitude (maths, reasoning, statistics)|क्वांटिटेटिव एप्टीट्यूड (गणित, तर्क, सांख्यिकी)|4;Business Economics|व्यावसायिक अर्थशास्त्र|3;Revision & full mocks|रिवीज़न और पूरे मॉक|3'),
 VAR('int1','CA Intermediate: Group 1','सीए इंटरमीडिएट: ग्रुप 1','ICAI holds it more than once a year. Check the ICAI schedule.',[1,5,9],[5,8],[180,100],
  'Advanced Accounting|एडवांस्ड अकाउंटिंग|5;Corporate & Other Laws|कॉर्पोरेट और अन्य विधि|4;Taxation (income tax & GST)|कराधान (आयकर और GST)|5;Revision & full mocks|रिवीज़न और पूरे मॉक|3'),
 VAR('int2','CA Intermediate: Group 2','सीए इंटरमीडिएट: ग्रुप 2','ICAI holds it more than once a year. Check the ICAI schedule.',[1,5,9],[5,8],[180,100],
  'Cost & Management Accounting|लागत और प्रबंधन लेखांकन|5;Auditing & Ethics|अंकेक्षण और नैतिकता|5;Financial Management & Strategic Management|वित्तीय प्रबंधन और रणनीतिक प्रबंधन|4;Revision & full mocks|रिवीज़न और पूरे मॉक|3'),
 VAR('int','CA Intermediate: both groups','सीए इंटरमीडिएट: दोनों ग्रुप','ICAI holds it more than once a year. Check the ICAI schedule.',[1,5,9],[6,9],[180,100],
  'Advanced Accounting|एडवांस्ड अकाउंटिंग|5;Corporate & Other Laws|कॉर्पोरेट और अन्य विधि|4;Taxation (income tax & GST)|कराधान (आयकर और GST)|5;Cost & Management Accounting|लागत और प्रबंधन लेखांकन|5;Auditing & Ethics|अंकेक्षण और नैतिकता|5;Financial Management & Strategic Management|वित्तीय प्रबंधन और रणनीतिक प्रबंधन|4;Revision & full mocks|रिवीज़न और पूरे मॉक|3'),
 VAR('fin','CA Final: both groups','सीए फाइनल: दोनों ग्रुप','Usually May and November. Check the ICAI schedule.',[5,11],[6,9],[180,100],
  'Financial Reporting|वित्तीय रिपोर्टिंग|5;Advanced Financial Management|एडवांस्ड फाइनेंशियल मैनेजमेंट|5;Advanced Auditing & Professional Ethics|एडवांस्ड ऑडिटिंग और व्यावसायिक नैतिकता|5;Corporate & Economic Laws|कॉर्पोरेट और आर्थिक विधि|4;Strategic Cost & Performance Management|रणनीतिक लागत और प्रदर्शन प्रबंधन|5;Direct Tax Laws & International Taxation|प्रत्यक्ष कर विधि और अंतर्राष्ट्रीय कराधान|5;Indirect Tax Laws|अप्रत्यक्ष कर विधि|4;Revision & full mocks|रिवीज़न और पूरे मॉक|3',
  [OPTG('Choose your elective paper','अपना इलेक्टिव पेपर चुनें',1,1,'Risk Management|जोखिम प्रबंधन|4;Financial Services & Capital Markets|वित्तीय सेवाएँ और पूँजी बाज़ार|4;International Taxation|अंतर्राष्ट्रीय कराधान|4;Economic Laws|आर्थिक विधि|4;Global Financial Reporting Standards|वैश्विक वित्तीय रिपोर्टिंग मानक|4;Multi-Disciplinary Case Study|बहु-विषयक केस स्टडी|4')])]},

{id:'bank',name:'Banking',hi:'बैंकिंग',d:'IBPS, SBI and other bank exams',dh:'IBPS, SBI और अन्य बैंक परीक्षाएँ',tools:'yt,unacad,tb,drive,tg',v:[
 VAR('po','Bank PO (IBPS / SBI)','बैंक पीओ (IBPS / SBI)','Dates change every year. Check the official notice.',[],[4,7],[60,100],
  'Reasoning Ability|तर्क क्षमता|5;Quantitative Aptitude & Data Interpretation|संख्यात्मक अभिक्षमता और डेटा इंटरप्रिटेशन|5;English Language|अंग्रेज़ी भाषा|5;General & Financial Awareness|सामान्य और वित्तीय जागरूकता|4;Computer Aptitude|कंप्यूटर अभिक्षमता|2;Descriptive writing (letter, essay)|वर्णनात्मक लेखन (पत्र, निबंध)|2;Revision & full mocks|रिवीज़न और पूरे मॉक|3'),
 VAR('clerk','Bank Clerk (IBPS / SBI)','बैंक क्लर्क (IBPS / SBI)','Dates change every year. Check the official notice.',[],[3,6],[60,100],
  'Reasoning Ability|तर्क क्षमता|5;Numerical Ability|संख्यात्मक क्षमता|5;English Language|अंग्रेज़ी भाषा|5;General & Financial Awareness|सामान्य और वित्तीय जागरूकता|4;Computer Aptitude|कंप्यूटर अभिक्षमता|2;Revision & full mocks|रिवीज़न और पूरे मॉक|3')]},

{id:'rail',name:'Railways (RRB)',hi:'रेलवे (RRB)',d:'RRB NTPC, Group D, ALP',dh:'RRB NTPC, ग्रुप D, ALP',tools:'yt,unacad,tb,drive,tg',v:[
 VAR('ntpc','RRB NTPC','आरआरबी एनटीपीसी','Dates change every year. Check the RRB notice.',[],[3,6],[90,100],
  'Mathematics|गणित|5;General Intelligence & Reasoning|सामान्य बुद्धिमत्ता और तर्क|5;General Awareness|सामान्य जागरूकता|5;Revision & full mocks|रिवीज़न और पूरे मॉक|3'),
 VAR('gd','RRB Group D','आरआरबी ग्रुप D','Dates change every year. Check the RRB notice.',[],[3,5],[90,100],
  'Mathematics|गणित|4;General Intelligence & Reasoning|सामान्य बुद्धिमत्ता और तर्क|4;General Science|सामान्य विज्ञान|5;General Awareness & Current Affairs|सामान्य जागरूकता और समसामयिकी|4;Revision & full mocks|रिवीज़न और पूरे मॉक|3'),
 VAR('alp','RRB ALP / Technician','आरआरबी एएलपी / टेक्नीशियन','Dates change every year. Check the RRB notice.',[],[3,6],[75,75],
  'Mathematics|गणित|4;General Intelligence & Reasoning|सामान्य बुद्धिमत्ता और तर्क|4;Basic Science & Engineering|मूल विज्ञान और इंजीनियरिंग|5;General Awareness|सामान्य जागरूकता|3;Revision & full mocks|रिवीज़न और पूरे मॉक|3')]},

{id:'cuet',name:'CUET UG',hi:'सीयूईटी यूजी',d:'Central university entrance',dh:'केंद्रीय विश्वविद्यालय प्रवेश परीक्षा',tools:'yt,pw,unacad,ncert,drive,tg',v:[
 VAR('ug','CUET UG','सीयूईटी यूजी','Usually May to June.',[5,6],[4,7],[60,250],
  'General Test|सामान्य परीक्षा|4;Revision & full mocks|रिवीज़न और पूरे मॉक|3',
  [OPTG('Choose your language','अपनी भाषा चुनें',1,1,'English|अंग्रेज़ी|4;Hindi|हिन्दी|4;Other language|अन्य भाषा|4'),
   OPTG('Choose your domain subjects (up to 5)','अपने डोमेन विषय चुनें (अधिकतम 5)',5,1,'Physics|भौतिकी|4;Chemistry|रसायन विज्ञान|4;Mathematics|गणित|4;Biology|जीव विज्ञान|4;Accountancy|लेखाशास्त्र|4;Business Studies|व्यवसाय अध्ययन|4;Economics|अर्थशास्त्र|4;History|इतिहास|4;Geography|भूगोल|4;Political Science|राजनीति विज्ञान|4;Psychology|मनोविज्ञान|4;Sociology|समाजशास्त्र|4;Computer Science / Informatics Practices|कंप्यूटर विज्ञान / इन्फॉर्मेटिक्स प्रैक्टिसेज़|4;Physical Education|शारीरिक शिक्षा|4;Legal Studies|विधि अध्ययन|4;Environmental Science|पर्यावरण विज्ञान|4')])]},

{id:'net',name:'NET / JAM',hi:'नेट / जैम',d:'UGC NET, CSIR NET, IIT JAM',dh:'UGC NET, CSIR NET, IIT JAM',tools:'nptel,yt,khan,drive,tg',v:[
 VAR('ugc','UGC NET','यूजीसी नेट','Usually twice a year, around June and December.',[6,12],[4,7],[180,300],
  'Paper 1: Teaching & Research Aptitude|पेपर 1: शिक्षण और अनुसंधान अभिक्षमता|4;Revision & full mocks|रिवीज़न और पूरे मॉक|3',
  [OPTG('Choose your Paper 2 subject','अपना पेपर 2 विषय चुनें',1,1,'Computer Science & Applications|कंप्यूटर साइंस और एप्लिकेशन|5;Commerce|वाणिज्य|5;Economics|अर्थशास्त्र|5;English|अंग्रेज़ी|5;Hindi|हिन्दी|5;History|इतिहास|5;Political Science|राजनीति विज्ञान|5;Sociology|समाजशास्त्र|5;Education|शिक्षा|5;Management|प्रबंधन|5;Law|विधि|5;Philosophy|दर्शनशास्त्र|5;Psychology|मनोविज्ञान|5;Public Administration|लोक प्रशासन|5;Mathematics|गणित|5;Geography|भूगोल|5;Library & Information Science|पुस्तकालय एवं सूचना विज्ञान|5;Home Science|गृह विज्ञान|5;Physical Education|शारीरिक शिक्षा|5')]),
 VAR('csir','CSIR NET','सीएसआईआर नेट','Usually twice a year, around June and December.',[6,12],[5,8],[180,200],
  'General Aptitude|सामान्य अभिक्षमता|3;Revision & full mocks|रिवीज़न और पूरे मॉक|3',
  [OPTG('Choose your subject area','अपना विषय क्षेत्र चुनें',1,1,'Chemical Sciences|रासायनिक विज्ञान|5;Earth Sciences|पृथ्वी विज्ञान|5;Life Sciences|जीवन विज्ञान|5;Mathematical Sciences|गणितीय विज्ञान|5;Physical Sciences|भौतिक विज्ञान|5')]),
 VAR('jphy','IIT JAM: Physics','आईआईटी जैम: भौतिकी','Usually early February.',[2],[5,8],[180,100],
  'Mathematical Methods|गणितीय विधियाँ|4;Mechanics & General Properties of Matter|यांत्रिकी और पदार्थ के सामान्य गुण|4;Oscillations, Waves & Optics|दोलन, तरंगें और प्रकाशिकी|4;Electricity & Magnetism|विद्युत और चुम्बकत्व|5;Kinetic Theory & Thermodynamics|गैस गतिज सिद्धांत और ऊष्मागतिकी|4;Modern Physics|आधुनिक भौतिकी|5;Solid State & Electronics|ठोस अवस्था और इलेक्ट्रॉनिक्स|3;Revision & full mocks|रिवीज़न और पूरे मॉक|3'),
 VAR('jchem','IIT JAM: Chemistry','आईआईटी जैम: रसायन विज्ञान','Usually early February.',[2],[5,8],[180,100],
  'Physical Chemistry|भौतिक रसायन|5;Organic Chemistry|कार्बनिक रसायन|5;Inorganic Chemistry|अकार्बनिक रसायन|5;Revision & full mocks|रिवीज़न और पूरे मॉक|3'),
 VAR('jmath','IIT JAM: Mathematics','आईआईटी जैम: गणित','Usually early February.',[2],[5,8],[180,100],
  'Real Analysis|वास्तविक विश्लेषण|5;Calculus of One & Several Variables|एक और अनेक चरों का कैलकुलस|4;Differential Equations|अवकल समीकरण|4;Linear Algebra|रैखिक बीजगणित|5;Abstract Algebra|अमूर्त बीजगणित|4;Vector Calculus|सदिश कैलकुलस|3;Sequences & Series|अनुक्रम और श्रेणी|3;Revision & full mocks|रिवीज़न और पूरे मॉक|3'),
 VAR('jstat','IIT JAM: Mathematical Statistics','आईआईटी जैम: गणितीय सांख्यिकी','Usually early February.',[2],[5,8],[180,100],
  'Mathematics (calculus, linear algebra)|गणित (कैलकुलस, रैखिक बीजगणित)|3;Probability|प्रायिकता|5;Random Variables & Distributions|यादृच्छिक चर और बंटन|5;Estimation|आकलन|4;Testing of Hypotheses|परिकल्पना परीक्षण|4;Revision & full mocks|रिवीज़न और पूरे मॉक|3')]},

{id:'tet',name:'Teaching (CTET / TET)',hi:'शिक्षण (CTET / TET)',d:'Teacher eligibility tests',dh:'शिक्षक पात्रता परीक्षाएँ',tools:'yt,unacad,ncert,drive,tg',v:[
 VAR('p1','CTET Paper 1 (classes 1 to 5)','सीटीईटी पेपर 1 (कक्षा 1 से 5)','Held once or twice a year. Check the CBSE notice.',[],[3,5],[150,150],
  'Child Development & Pedagogy|बाल विकास और शिक्षाशास्त्र|5;Language I|भाषा I|4;Language II|भाषा II|4;Mathematics|गणित|4;Environmental Studies|पर्यावरण अध्ययन|4;Revision & full mocks|रिवीज़न और पूरे मॉक|3'),
 VAR('p2','CTET Paper 2 (classes 6 to 8)','सीटीईटी पेपर 2 (कक्षा 6 से 8)','Held once or twice a year. Check the CBSE notice.',[],[3,5],[150,150],
  'Child Development & Pedagogy|बाल विकास और शिक्षाशास्त्र|5;Language I|भाषा I|4;Language II|भाषा II|4;Revision & full mocks|रिवीज़न और पूरे मॉक|3',
  [OPTG('Choose your subject group','अपना विषय समूह चुनें',1,1,'Mathematics & Science|गणित और विज्ञान|5;Social Studies / Social Science|सामाजिक अध्ययन / सामाजिक विज्ञान|5')])]},

{id:'board',name:'School boards',hi:'स्कूल बोर्ड',d:'Class 10 and class 12',dh:'कक्षा 10 और कक्षा 12',tools:'yt,khan,ncert,pw,drive',v:[
 VAR('c10','Class 10','कक्षा 10','Usually February to March.',[2,3],[3,5],[180,80],
  'Mathematics|गणित|5;Science|विज्ञान|5;Social Science|सामाजिक विज्ञान|4;English|अंग्रेज़ी|4;Hindi / second language|हिन्दी / द्वितीय भाषा|3;Revision & full mocks|रिवीज़न और पूरे मॉक|3'),
 VAR('c12pcm','Class 12 Science (PCM)','कक्षा 12 विज्ञान (PCM)','Usually February to March.',[2,3],[4,7],[180,70],
  'Physics|भौतिकी|5;Chemistry|रसायन विज्ञान|5;Mathematics|गणित|5;English|अंग्रेज़ी|3;Revision & full mocks|रिवीज़न और पूरे मॉक|3',
  [OPTG('Fifth subject','पाँचवाँ विषय',1,0,'Computer Science|कंप्यूटर विज्ञान|4;Physical Education|शारीरिक शिक्षा|3;Hindi|हिन्दी|3')]),
 VAR('c12pcb','Class 12 Science (PCB)','कक्षा 12 विज्ञान (PCB)','Usually February to March.',[2,3],[4,7],[180,70],
  'Physics|भौतिकी|5;Chemistry|रसायन विज्ञान|5;Biology|जीव विज्ञान|5;English|अंग्रेज़ी|3;Revision & full mocks|रिवीज़न और पूरे मॉक|3',
  [OPTG('Fifth subject','पाँचवाँ विषय',1,0,'Mathematics|गणित|4;Physical Education|शारीरिक शिक्षा|3;Hindi|हिन्दी|3')]),
 VAR('c12com','Class 12 Commerce','कक्षा 12 वाणिज्य','Usually February to March.',[2,3],[3,6],[180,80],
  'Accountancy|लेखाशास्त्र|5;Business Studies|व्यवसाय अध्ययन|4;Economics|अर्थशास्त्र|4;English|अंग्रेज़ी|3;Revision & full mocks|रिवीज़न और पूरे मॉक|3',
  [OPTG('Fifth subject','पाँचवाँ विषय',1,0,'Mathematics|गणित|4;Informatics Practices|इन्फॉर्मेटिक्स प्रैक्टिसेज़|3;Physical Education|शारीरिक शिक्षा|3')]),
 VAR('c12arts','Class 12 Humanities','कक्षा 12 मानविकी','Usually February to March.',[2,3],[3,6],[180,80],
  'English|अंग्रेज़ी|3;Political Science|राजनीति विज्ञान|4;History|इतिहास|4;Geography|भूगोल|4;Revision & full mocks|रिवीज़न और पूरे मॉक|3',
  [OPTG('Other subject','अन्य विषय',1,0,'Economics|अर्थशास्त्र|4;Sociology|समाजशास्त्र|4;Psychology|मनोविज्ञान|4;Hindi|हिन्दी|3')])]},

{id:'psc',name:'State PSC',hi:'राज्य लोक सेवा आयोग',d:'State civil services',dh:'राज्य सिविल सेवाएँ',tools:'yt,unacad,ncert,drive,tg',v:[
 VAR('psc','State PSC (prelims + mains)','राज्य PSC (प्रारंभिक + मुख्य)','Each state has its own schedule. Check your state commission.',[],[5,8],[120,200],
  'History & Culture|इतिहास और संस्कृति|4;Geography|भूगोल|4;Polity & Governance|राजव्यवस्था और शासन|4;Economy|अर्थव्यवस्था|4;Science & Technology|विज्ञान और प्रौद्योगिकी|3;Environment|पर्यावरण|3;Your state: history, geography, economy|आपका राज्य: इतिहास, भूगोल, अर्थव्यवस्था|5;Aptitude & Reasoning|अभिक्षमता और तर्क|3;Current Affairs|समसामयिकी|4;Essay & answer writing|निबंध और उत्तर लेखन|3;Revision & full mocks|रिवीज़न और पूरे मॉक|3')]}
];

/* the starting tools offered in the "what do you study with" step */
const TOOLS=[
 {id:'yt',name:'YouTube',url:'https://www.youtube.com',pkg:'com.google.android.youtube'},
 {id:'nptel',name:'NPTEL',url:'https://nptel.ac.in',pkg:''},
 {id:'pw',name:'Physics Wallah (PW)',url:'https://www.pw.live',pkg:'xyz.penpencil.physicswala'},
 {id:'unacad',name:'Unacademy',url:'https://unacademy.com',pkg:'com.unacademyapp'},
 {id:'khan',name:'Khan Academy',url:'https://www.khanacademy.org',pkg:'org.khanacademy.android'},
 {id:'tb',name:'Testbook',url:'https://testbook.com',pkg:'com.testbook.tbapp'},
 {id:'gato',name:'GATE Overflow',url:'https://gateoverflow.in',pkg:''},
 {id:'ncert',name:'NCERT books',url:'https://ncert.nic.in/textbook.php',pkg:''},
 {id:'drive',name:'Google Drive (PDFs, notes)',url:'https://drive.google.com',pkg:'com.google.android.apps.docs'},
 {id:'tg',name:'Telegram (study channels)',url:'https://web.telegram.org',pkg:'org.telegram.messenger'}
];
const TOOLS_HI={'NCERT books':'NCERT की किताबें','Google Drive (PDFs, notes)':'Google Drive (PDF, नोट्स)','Telegram (study channels)':'Telegram (पढ़ाई के चैनल)'};

const WHEN_HI={
"Usually January and April sessions.": "आम तौर पर जनवरी और अप्रैल के सत्र।",
"Usually May or June, after JEE Main.": "आम तौर पर मई या जून, JEE Main के बाद।",
"Main usually January and April, Advanced May or June.": "Main आम तौर पर जनवरी और अप्रैल में, Advanced मई या जून में।",
"Usually the January and April sessions.": "आम तौर पर जनवरी और अप्रैल के सत्र।",
"Advanced usually May or June, the architecture test just after.": "Advanced आम तौर पर मई या जून में, आर्किटेक्चर टेस्ट उसके तुरंत बाद।",
"Usually early May.": "आम तौर पर मई की शुरुआत में।",
"The date changes a lot between years. In recent years it was in summer.": "तारीख़ हर साल काफ़ी बदलती है। हाल के सालों में यह गर्मियों में हुई।",
"Usually early February.": "आम तौर पर फ़रवरी की शुरुआत में।",
"Usually early February (some years late January). The dates change every year.": "आम तौर पर फ़रवरी की शुरुआत में (कुछ सालों में जनवरी के अंत में)। तारीख़ें हर साल बदलती हैं।",
"Prelims is usually late May or June, Mains about three months later.": "प्रिलिम्स आम तौर पर मई के अंत या जून में, मेन्स लगभग तीन महीने बाद।",
"Usually late May or June.": "आम तौर पर मई के अंत या जून में।",
"The date changes every year. Check the UPSC notice.": "तारीख़ हर साल बदलती है। UPSC की सूचना देखें।",
"Dates change every year. Check the SSC calendar.": "तारीख़ें हर साल बदलती हैं। SSC का कैलेंडर देखें।",
"Held twice a year, usually April and September.": "साल में दो बार, आम तौर पर अप्रैल और सितंबर में।",
"Usually the last Sunday of November.": "आम तौर पर नवंबर का आख़िरी रविवार।",
"Usually early January.": "आम तौर पर जनवरी की शुरुआत में।",
"Dates change every year. Check the NTA notice.": "तारीख़ें हर साल बदलती हैं। NTA की सूचना देखें।",
"Held in a window of several weeks. Check the official site.": "कई हफ़्तों की अवधि में होती है। आधिकारिक साइट देखें।",
"Usually around May.": "आम तौर पर मई के आसपास।",
"Usually the first Sunday of December.": "आम तौर पर दिसंबर का पहला रविवार।",
"Usually December.": "आम तौर पर दिसंबर में।",
"Usually around December.": "आम तौर पर दिसंबर के आसपास।",
"ICAI holds it more than once a year. Check the ICAI schedule.": "ICAI इसे साल में एक से ज़्यादा बार कराता है। ICAI का कार्यक्रम देखें।",
"Usually May and November. Check the ICAI schedule.": "आम तौर पर मई और नवंबर में। ICAI का कार्यक्रम देखें।",
"Dates change every year. Check the official notice.": "तारीख़ें हर साल बदलती हैं। आधिकारिक सूचना देखें।",
"Dates change every year. Check the RRB notice.": "तारीख़ें हर साल बदलती हैं। RRB की सूचना देखें।",
"Usually May to June.": "आम तौर पर मई से जून।",
"Usually twice a year, around June and December.": "आम तौर पर साल में दो बार, जून और दिसंबर के आसपास।",
"Held once or twice a year. Check the CBSE notice.": "साल में एक या दो बार होती है। CBSE की सूचना देखें।",
"Usually February to March.": "आम तौर पर फ़रवरी से मार्च।",
"Each state has its own schedule. Check your state commission.": "हर राज्य का अपना कार्यक्रम होता है। अपने राज्य के आयोग की साइट देखें।"
};
/* Hindi for every name above, so the screens and the saved subjects can follow the language switch */
(function(){
  const put=(en,hi)=>{if(en&&hi&&!Object.prototype.hasOwnProperty.call(HI,en))HI[en]=hi};
  for(const f of EXAMS){
    put(f.name,f.hi);put(f.d,f.dh);
    for(const v of f.v){put(v.name,v.hi);put(v.when,WHEN_HI[v.when]);for(const s of v.s)put(s.name,s.hi);for(const g of v.o){put(g.q,g.qh);for(const s of g.l)put(s.name,s.hi)}}
  }
  for(const k in TOOLS_HI)put(k,TOOLS_HI[k]);
  put(SSB_OPT.q,SSB_OPT.qh);
})();
