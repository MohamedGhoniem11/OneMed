import type {
  User, Patient, MedicalRecord, Prescription, Pharmacy, Institution, Consent,
  EmergencyProfile, Conversation, Message, Notification, AuditEntry, GuidelineChunk, Role,
} from '../types';

const KEY = 'onemed.demo.v1';
const now = Date.now();
const iso = (daysAgo = 0) => new Date(now - daysAgo * 86400000).toISOString();
const future = (days: number) => new Date(now + days * 86400000).toISOString();

export interface DemoDB {
  users: User[]; patients: Patient[]; doctors: {id:string;userId:string;name:string;specialty:string;licenseNumber:string;city:string;clinicName:string;verified:boolean}[]; records: MedicalRecord[]; prescriptions: Prescription[];
  pharmacies: Pharmacy[]; institutions: Institution[]; consents: Consent[];
  emergencyProfiles: EmergencyProfile[]; conversations: Conversation[]; messages: Message[];
  notifications: Notification[]; audit: AuditEntry[]; guidelines: GuidelineChunk[];
  deletionRequests: { id: string; patientId: string; requestedAt: string; status: string }[];
  connectionQrs: { token: string; doctorId: string; doctorName: string; createdAt: string; expiresAt: string }[];
}

export const DEMO_PASSWORDS: Record<string, string> = {
  'user_patient_1': 'Demo!onemed1', 'user_doctor_1': 'Demo!onemedD1',
  'user_lab_staff': 'Demo!onemedL1', 'user_pharmacy': 'Demo!onemedP1',
  'user_hospital_admin': 'Demo!onemedH1', 'user_admin': 'Demo!onemedA1',
};

function seed(): DemoDB {
  const users: User[] = [
    { uid:'user_patient_1', name:'Mona Ali Hassan', email:'mona.patient@example.com', phone:'01012345678', role:'patient', emergencyContact:{name:'Ahmed Ali',relationship:'Brother',phone:'0105555123'} },
    { uid:'user_patient_2', name:'Youssef Karim Adel', email:'youssef.patient@example.com', phone:'01122334455', role:'patient', emergencyContact:{name:'Nadia Adel',relationship:'Mother',phone:'0115555666'} },
    { uid:'user_doctor_1', name:'Dr. Karim Hassan', email:'karim.doctor@example.com', phone:'01112345678', role:'doctor', institutionId:'inst_alexandria_main', mfaEnabled:true },
    { uid:'user_lab_staff', name:'Nadia Lab Technician', email:'nadia.lab@example.com', phone:'01234567890', role:'lab_staff', institutionId:'inst_alexandria_lab' },
    { uid:'user_pharmacy', name:'Pharmacy Partner Desk', email:'pharmacy.desk@example.com', phone:'01098765432', role:'pharmacy', institutionId:'pharm_medica' },
    { uid:'user_hospital_admin', name:'Dr. Ahmed Mansour', email:'admin.hospital@example.com', phone:'0102222333', role:'hospital_admin', institutionId:'inst_alexandria_main' },
    { uid:'user_admin', name:'System Administrator', email:'admin@onemed.example', phone:'0100000000', role:'admin' },
  ];
  const patients: Patient[] = [
    { id:'user_patient_1', userId:'user_patient_1', nationalId:'29801010101234', name:'Mona Ali Hassan', dateOfBirth:'1985-03-14', gender:'female', bloodGroup:'O+', phone:'01012345678', address:'12 El-Geish Road, Alexandria', city:'Alexandria', allergies:['Penicillin','Latex'], chronicDiseases:['Type 2 Diabetes','Hypertension'], emergencyContact:{name:'Ahmed Ali',relationship:'Brother',phone:'0105555123'}, primaryPhysician:'Dr. Karim Hassan', primaryPhysicianPhone:'01112345678', location:{lat:31.2,lng:29.92} },
    { id:'user_patient_2', userId:'user_patient_2', nationalId:'2910202010123', name:'Youssef Karim Adel', dateOfBirth:'1992-07-22', gender:'male', bloodGroup:'A+', phone:'01122334455', address:'5 Talaat Harb, Cairo', city:'Cairo', allergies:['Sulfonamides'], chronicDiseases:['Asthma'], emergencyContact:{name:'Nadia Adel',relationship:'Mother',phone:'0115555666'}, primaryPhysician:'Dr. Sarah Jenkins', primaryPhysicianPhone:'0108888777', location:{lat:30.04,lng:31.24} },
  ];
  const records: MedicalRecord[] = [
    { id:'r1', patientId:'user_patient_1', type:'lab', title:'Comprehensive Metabolic Panel (CMP)', institution:'Alexandria Central Laboratory', date:iso(0), summary:'Glucose elevated, creatinine normal', confidence:98, status:'accessible', values:[
      {name:'Glucose, Fasting',value:115,unit:'mg/dL',referenceLow:70,referenceHigh:99,flag:'high'},
      {name:'Creatinine',value:0.9,unit:'mg/dL',referenceLow:0.7,referenceHigh:1.3,flag:'normal'},
      {name:'HbA1c',value:7.2,unit:'%',referenceLow:4,referenceHigh:5.6,flag:'high'},
    ]},
    { id:'r2', patientId:'user_patient_1', type:'imaging', title:'Chest X-Ray (PA & Lateral)', institution:'Alexandria Main University Hospital', date:iso(12), summary:'No acute cardiopulmonary abnormality. Clear lung fields bilaterally.', modality:'X-Ray', confidence:99, status:'accessible' },
    { id:'r3', patientId:'user_patient_1', type:'prescription', title:'Internal Medicine Consultation', institution:'Nasr City Medical Center', date:iso(40), summary:'Metformin 500mg BID; Lisinopril 10mg daily', confidence:94, status:'accessible' },
    { id:'r4', patientId:'user_patient_1', type:'vitals', title:'Vital Signs', institution:'Alexandria Main University Hospital', date:iso(0), summary:'BP 128/82, HR 74, Temp 37.1, SpO2 98', values:[
      {name:'Systolic',value:128,unit:'mmHg',referenceLow:90,referenceHigh:120,flag:'high'},
      {name:'Diastolic',value:82,unit:'mmHg',referenceLow:60,referenceHigh:80,flag:'high'},
      {name:'Heart Rate',value:74,unit:'bpm',referenceLow:60,referenceHigh:100,flag:'normal'},
      {name:'SpO2',value:98,unit:'%',referenceLow:95,referenceHigh:100,flag:'normal'},
    ]},
    { id:'r5', patientId:'user_patient_1', type:'lab', title:'Lipid Panel', institution:'Alexandria Central Laboratory', date:iso(5), values:[
      {name:'Total Cholesterol',value:210,unit:'mg/dL',referenceLow:0,referenceHigh:200,flag:'high'},
      {name:'LDL',value:135,unit:'mg/dL',referenceLow:0,referenceHigh:100,flag:'high'},
      {name:'HDL',value:55,unit:'mg/dL',referenceLow:40,referenceHigh:100,flag:'normal'},
    ]},
    { id:'r6', patientId:'user_patient_1', type:'visit', title:'Diabetes Follow-up', institution:'Nasr City Medical Center', date:iso(30), summary:'Routine follow-up; medication adherence discussed.' },
    { id:'r7', patientId:'user_patient_2', type:'lab', title:'Asthma Review Panel', institution:'Alexandria Central Laboratory', date:iso(3), confidence:96, status:'accessible', values:[{name:'WBC',value:6.8,unit:'x10^3/uL',referenceLow:4.5,referenceHigh:11,flag:'normal'}] },
    { id:'r8', patientId:'user_patient_2', type:'note', title:'Emergency Department Note', institution:'Alexandria Main University Hospital', date:iso(20), summary:'Presented with wheeze; responded to nebulised salbutamol.' },
  ];
  // Longitudinal lab trends for analytics
  const months = ['May','Jun','Jul','Aug','Sep','Oct'];
  months.forEach((m, i) => {
    records.push({ id:`tr-a1c-${i}`, patientId:'user_patient_1', type:'lab', title:'HbA1c', institution:'Alexandria Central Laboratory', date:new Date(now - (5-i)*30*86400000).toISOString(), values:[{name:'HbA1c',value:[7.8,7.6,7.4,7.5,7.3,7.2][i],unit:'%',referenceLow:4,referenceHigh:5.6,flag:'high'}] });
    records.push({ id:`tr-bp-${i}`, patientId:'user_patient_1', type:'vitals', title:'Blood Pressure', institution:'Alexandria Main University Hospital', date:new Date(now - (5-i)*30*86400000).toISOString(), values:[{name:'Systolic',value:[134,131,128,125,130,128][i],unit:'mmHg',referenceLow:90,referenceHigh:120},{name:'Diastolic',value:[86,84,82,80,84,82][i],unit:'mmHg',referenceLow:60,referenceHigh:80}] });
  });
  const pharmacies: Pharmacy[] = [
    { id:'pharm_medica', name:'MediCare Plus Pharmacy', address:'14 El-Geish Road', city:'Alexandria', phone:'01098765432', whatsapp:'01098765432', lat:31.201, lng:29.921, hours:'Open 24/7', rating:4.8, active:true, status:'approved', monthlyFee:1500 },
    { id:'pharm_city', name:'City Central Care', address:'3 Saad Zaghloul Square', city:'Alexandria', phone:'01234567891', whatsapp:'01234567891', lat:31.198, lng:29.918, hours:'08:00 - 22:00', rating:4.5, active:true, status:'approved', monthlyFee:1500 },
    { id:'pharm_nile', name:'Nile Valley Pharmacy', address:'90 Corniche', city:'Alexandria', phone:'01122334455', whatsapp:'01122334455', lat:31.212, lng:29.935, hours:'09:00 - 23:00', rating:4.2, active:true, status:'pending', monthlyFee:1500 },
  ];
  const institutions: Institution[] = [
    { id:'inst_alexandria_main', name:'Alexandria Main University Hospital', type:'hospital', licenseNumber:'HOSP-ALX-001', city:'Alexandria', address:'El Chatby, Alexandria', verified:true, active:true },
    { id:'inst_alexandria_lab', name:'Alexandria Central Laboratory', type:'laboratory', licenseNumber:'LAB-ALX-002', city:'Alexandria', address:'Smouha, Alexandria', verified:true, active:true },
    { id:'inst_nasr_clinic', name:'Nasr City Medical Center', type:'clinic', licenseNumber:'CLIN-CAI-003', city:'Cairo', address:'Nasr City, Cairo', verified:true, active:true },
    { id:'inst_pending_lab', name:'Delta Diagnostics Lab', type:'laboratory', licenseNumber:'LAB-DLT-004', city:'Alexandria', address:'Moharam Bek', verified:false, active:false },
  ];
  const consents: Consent[] = [
    { id:'c1', patientId:'user_patient_1', granteeType:'doctor', granteeId:'user_doctor_1', granteeName:'Dr. Karim Hassan', scope:'records,prescriptions', purpose:'Treatment at registered facility', active:true, grantedAt:iso(90) },
    { id:'c2', patientId:'user_patient_1', granteeType:'institution', granteeId:'inst_alexandria_lab', granteeName:'Alexandria Central Laboratory', scope:'records', purpose:'Lab result delivery', active:true, grantedAt:iso(80) },
    { id:'c3', patientId:'user_patient_2', granteeType:'doctor', granteeId:'user_doctor_1', granteeName:'Dr. Karim Hassan', scope:'records', purpose:'Consultation', active:false, grantedAt:iso(50), expiresAt:iso(20) },
  ];
  const prescriptions: Prescription[] = [
    { id:'rx1', doctorId:'user_doctor_1', doctorName:'Dr. Karim Hassan', patientId:'user_patient_1', patientName:'Mona Ali Hassan', date:iso(5), status:'confirmed', extractionStatus:'confirmed', confidence:94, medicines:[
      {name:'Amoxicillin',dosage:'500mg',frequency:'1-0-1 (BID)',duration:'5 Days',confidence:97},
      {name:'Paracetamol',dosage:'650mg',frequency:'SOS',duration:'3 Days',confidence:88},
    ], linkToken:'rx-demo-8f3a', linkExpiresAt:future(1), fulfillmentLink:`/f/rx-demo-8f3a`, pharmacyId:'pharm_medica', orderStatus:'preparing' },
    { id:'rx2', doctorId:'user_doctor_1', doctorName:'Dr. Karim Hassan', patientId:'user_patient_2', patientName:'Youssef Karim Adel', date:iso(1), status:'confirmed', extractionStatus:'confirmed', confidence:91, medicines:[{name:'Metformin',dosage:'500mg',frequency:'OD',duration:'30 Days',confidence:92}], orderStatus:'received' },
  ];
  const emergencyProfiles: EmergencyProfile[] = [
    { token:'em-demo-mona', patientId:'user_patient_1', nfcUid:'NTAG424-0A1B', qrIssued:true, nfcIssued:true, activatedAt:iso(100), scanCount:7, settings:{showBloodType:true,showAllergies:true,showConditions:true,showMedications:true,showContacts:true,aiChatbotEnabled:true} },
    { token:'em-demo-youssef', patientId:'user_patient_2', qrIssued:true, nfcIssued:false, activatedAt:iso(40), scanCount:2, settings:{showBloodType:true,showAllergies:true,showConditions:true,showMedications:false,showContacts:true,aiChatbotEnabled:true} },
  ];
  const conversations: Conversation[] = [
    { id:'conv1', patientId:'user_patient_1', otherUserId:'user_doctor_1', otherName:'Dr. Karim Hassan', role:'doctor', updatedAt:iso(2) },
    { id:'conv2', patientId:'user_patient_1', otherUserId:'user_pharmacy', otherName:'MediCare Plus Pharmacy', role:'pharmacy', updatedAt:iso(1) },
  ];
  const messages: Message[] = [
    { id:'m1', conversationId:'conv1', senderId:'user_doctor_1', text:'Your HbA1c is trending down - keep up the good work.', sentAt:iso(2) },
    { id:'m2', conversationId:'conv1', senderId:'user_patient_1', text:'Thank you doctor! I will continue the medication.', sentAt:iso(2) },
    { id:'m3', conversationId:'conv2', senderId:'user_pharmacy', text:'Your order is being prepared. Ready in 30 minutes.', sentAt:iso(1) },
  ];
  const notifications: Notification[] = [
    { id:'n1', userId:'user_patient_1', title:'New lab result available', body:'Comprehensive Metabolic Panel from Alexandria Central Laboratory', type:'lab', read:false, createdAt:iso(0) },
    { id:'n2', userId:'user_patient_1', title:'Prescription ready for fulfillment', body:'Dr. Karim Hassan issued a new prescription', type:'prescription', read:false, createdAt:iso(1) },
    { id:'n3', userId:'user_doctor_1', title:'Pending prescription review', body:'2 prescriptions awaiting confirmation', type:'prescription', read:false, createdAt:iso(1) },
  ];
  const guidelines: GuidelineChunk[] = [
    { id:'g1', text:'Check responsiveness: tap the person gently and shout for help. If there is no response, call emergency services (123) immediately and ask for an ambulance.', source:'AHA CPR & First Aid 2024', section:'4.2 Unresponsive adult', tags:['collapse','unresponsive','cpr','breathing'], language:'en', version:'2024' },
    { id:'g2', text:'Begin chest compressions: place the heel of one hand in the centre of the chest, interlock fingers, push hard and fast (100-120 compressions per minute, about 5-6 cm deep). Continue until help arrives.', source:'AHA CPR & First Aid 2024', section:'4.3 Chest compressions', tags:['cpr','compression','cardiac','collapse'], language:'en', version:'2024' },
    { id:'g3', text:'For a seizure: protect the person from injury, place something soft under the head, do not restrain them, and do not put anything in their mouth. Note the time. Call emergency services if the seizure lasts more than 5 minutes or repeats.', source:'IFRC First Aid 2024', section:'Seizure response', tags:['seizure','epilepsy','shaking','convulsion'], language:'en', version:'2024' },
    { id:'g4', text:'For a severe allergic reaction with swelling or difficulty breathing: call emergency services (123) immediately. Help the person sit upright, check whether they have their prescribed adrenaline auto-injector, and assist its use as directed. Do not delay professional help.', source:'WHO Basic Emergency Care', section:'Anaphylaxis', tags:['allergy','anaphylaxis','swelling','breathing','epipen'], language:'en', version:'2024' },
    { id:'g5', text:'If the person is breathing but unresponsive, place them in the recovery position: roll onto their side with the head tilted back and the airway open. Monitor breathing continuously until help arrives.', source:'Red Cross Basic Life Support', section:'Recovery position', tags:['recovery','breathing','unresponsive','position'], language:'en', version:'2024' },
    { id:'g6', text:'افحص الاستجابة: اضغط على الكتف بلطف واستنجد. إذا لم يستجب الشخص، اتصل بالإسعاف (١٢٣) فوراً واطلب سيارة إسعاف.', source:'AHA CPR & First Aid 2024', section:'٤.٢ فقدان الوعي', tags:['انهيار','فقدان وعي','تنفس'], language:'ar', version:'2024' },
    { id:'g7', text:'أثناء التشنج: احمِ الشخص من الإصابة،ضع شيئاً ناعماً تحت الرأس،لا تمنعه من الحركة،ولا تضع أي شيء في فمه. اتصل بالإسعاف إذا استمر التشنج أكثر من ٥ دقائق.', source:'IFRC First Aid 2024', section:'التعامل مع التشنج', tags:['تشنج','صرع','ارتجاف'], language:'ar', version:'2024' },
  ];
  const audit: AuditEntry[] = [
    { id:'a1', patientId:'user_patient_1', actor:'user_doctor_1', actorName:'Dr. Karim Hassan', action:'patient_record_viewed', resource:'patients/user_patient_1', timestamp:iso(1), ip:'192.168.1.20', hash:'', previousHash:'' },
  ];
  // Build hash chain
  let prev = '0'.repeat(64);
  for (const e of audit) { e.previousHash = prev; e.hash = fakeHash(`${prev}${e.action}${e.timestamp}`); prev = e.hash; }
  const doctors = users.filter(u=>u.role==='doctor').map(u=>({id:u.uid,userId:u.uid,name:u.name,specialty:'Internal Medicine',licenseNumber:'DOC-ALX-001',city:'Alexandria',clinicName:'Alexandria Main University Hospital',verified:true}));
  return { users, patients, doctors, records, prescriptions, pharmacies, institutions, consents, emergencyProfiles, conversations, messages, notifications, audit, guidelines, deletionRequests:[], connectionQrs:[] };
}
function fakeHash(s: string) { let h = 2166136261; for (let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h,16777619); } return (h>>>0).toString(16).padStart(8,'0').repeat(8); }

export function loadDB(): DemoDB {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as DemoDB;
  } catch { /* reset below */ }
  const db = seed();
  saveDB(db);
  return db;
}
export function saveDB(db: DemoDB) { localStorage.setItem(KEY, JSON.stringify(db)); }
export function resetDB() { localStorage.removeItem(KEY); return loadDB(); }
export function findUserByEmail(email: string) { return loadDB().users.find(u => u.email.toLowerCase() === email.toLowerCase()); }
export function roleHome(role: Role) {
  return ({ patient:'/app/patient', doctor:'/app/doctor', lab_staff:'/app/lab', pharmacy:'/app/pharmacy', hospital_admin:'/app/hospital', admin:'/app/admin' } as Record<Role,string>)[role] || '/app';
}
