/**
 * Curated first-aid library (OQ15): original, conservative paraphrases with
 * source attribution. No diagnostic, drug or treatment-protocol content.
 */
export const GUIDELINES = [
  {
    id: "aha-unresponsive",
    text: "Check responsiveness by gently tapping the person's shoulders and speaking loudly. If there is no response, call emergency services (123) immediately and ask for an ambulance. Send someone to guide the ambulance if possible.",
    source: "AHA CPR & First Aid 2024", section: "4.2 Unresponsive adult", tags: ["collapse", "unresponsive", "not breathing", "fainted", " consciousness"],
    language: "en", version: "2024",
  },
  {
    id: "aha-cpr",
    text: "For an adult who is not breathing normally, begin chest compressions: place the heel of one hand in the centre of the chest, interlock the fingers, push hard and fast at 100 to 120 compressions per minute, and allow full chest recoil. Continue until professional help takes over.",
    source: "AHA CPR & First Aid 2024", section: "4.3 Chest compressions", tags: ["cpr", "cardiac", "heart", "compression", "not breathing", "collapse"],
    language: "en", version: "2024",
  },
  {
    id: "ifrc-seizure",
    text: "During a seizure, protect the person from injury, place something soft under the head, do not restrain their movements, and never put anything in the mouth. Time the seizure. Call emergency services if it lasts longer than five minutes, repeats, or the person does not recover.",
    source: "IFRC First Aid 2024", section: "Seizure response", tags: ["seizure", "epilepsy", "shaking", "convulsion", "fit"],
    language: "en", version: "2024",
  },
  {
    id: "ifrc-anaphylaxis",
    text: "For swelling of the face or throat with difficulty breathing, treat it as a medical emergency. Call emergency services (123) immediately. Help the person sit upright, check whether they have their own prescribed adrenaline auto-injector, and assist its use as directed. Stay with them until help arrives.",
    source: "IFRC First Aid 2024", section: "Severe allergic reaction", tags: ["allergy", "anaphylaxis", "swelling", "breathing", "epipen", "penicillin"],
    language: "en", version: "2024",
  },
  {
    id: "who-recovery",
    text: "If the person is breathing but not fully conscious, place them in the recovery position: roll them onto their side, tilt the head back to keep the airway open, and check breathing continuously until help arrives.",
    source: "WHO Basic Emergency Care", section: "Recovery position", tags: ["recovery", "breathing", "unconscious", "side", "airway"],
    language: "en", version: "2024",
  },
  {
    id: "rcs-bleeding",
    text: "For severe bleeding, apply firm direct pressure with a clean cloth and do not remove soaked dressings. If blood soaks through, add more cloth on top. Call emergency services (123) and keep the person still and warm.",
    source: "Red Cross Basic Life Support", section: "Severe bleeding", tags: ["bleeding", "wound", "blood", "pressure", "injury"],
    language: "en", version: "2024",
  },
  {
    id: "ar-unresponsive",
    text: "تحقق من الاستجابة بربت الكتف بلطف والتحدث بصوت عال. إذا لم يستجب الشخص، اتصل بالإسعاف (١٢٣) فوراً واطلب سيارة إسعاف.",
    source: "AHA CPR & First Aid 2024", section: "٤.٢ فقدان الوعي", tags: ["انهيار", "فقدان وعي", "تنفس", "غيبوبة"],
    language: "ar", version: "2024",
  },
  {
    id: "ar-seizure",
    text: "أثناء التشنج، احمِ الشخص من الإصابة وضع شيئاً ناعماً تحت رأسه، ولا تمنع حركته ولا تضع أي شيء في فمه. اتصل بالإسعاف إذا استمر التشنج أكثر من خمس دقائق أو تكرر.",
    source: "IFRC First Aid 2024", section: "التعامل مع التشنج", tags: ["تشنج", "صرع", "ارتجاف", "انقباض"],
    language: "ar", version: "2024",
  },
];
