export type Role = 'patient' | 'doctor' | 'lab_staff' | 'pharmacy' | 'hospital_admin' | 'admin';
export type Lang = 'en' | 'ar';

export interface EmergencyContact { name: string; relationship: string; phone: string }
export interface User {
  uid: string; name: string; email: string; role: Role; phone: string;
  institutionId?: string; emergencyContact?: EmergencyContact;
  mfaEnabled?: boolean; status?: string; createdAt?: string;
}
export interface Patient {
  id: string; userId: string; nationalId: string; name: string; dateOfBirth: string;
  gender: 'male' | 'female'; bloodGroup: string; phone: string; address: string;
  city: string; allergies: string[]; chronicDiseases: string[];
  emergencyContact: EmergencyContact; primaryPhysician: string;
  primaryPhysicianPhone: string; location?: { lat: number; lng: number };
}
export interface LabValue { name: string; value: number; unit: string; referenceLow: number; referenceHigh: number; flag?: 'normal' | 'high' | 'low' }
export interface MedicalRecord {
  id: string; patientId: string; type: 'lab' | 'imaging' | 'prescription' | 'note' | 'visit' | 'vitals';
  title: string; institution: string; institutionId?: string; date: string;
  summary?: string; details?: string; values?: LabValue[]; confidence?: number;
  status?: 'accessible' | 'needs_review' | 'archived'; modality?: string; lifecycle?: string;
}
export interface Medicine { name: string; dosage: string; frequency: string; duration: string; instructions?: string; confidence?: number }
export type OrderStatus = 'received' | 'verifying' | 'preparing' | 'ready' | 'handed_over' | 'completed' | 'cancelled';
export interface Prescription {
  id: string; doctorId: string; doctorName: string; patientId: string; patientName: string;
  date: string; status: 'pending' | 'confirmed' | 'cancelled'; extractionStatus: 'pending' | 'extracted' | 'confirmed' | 'cancelled';
  medicines: Medicine[]; confidence: number; notes?: string; linkToken?: string;
  linkExpiresAt?: string; fulfillmentLink?: string; pharmacyId?: string; orderStatus?: OrderStatus;
  whatsappUrl?: string;
}
export interface Pharmacy {
  id: string; name: string; address: string; city: string; phone: string; whatsapp: string;
  lat: number; lng: number; hours: string; rating: number; active: boolean; status: 'pending' | 'approved' | 'suspended';
  monthlyFee: number;
}
export interface Institution { id: string; name: string; type: 'hospital' | 'laboratory' | 'clinic'; licenseNumber: string; city: string; address: string; verified: boolean; active: boolean; contactEmail?: string; contactPhone?: string }
export interface Consent { id: string; patientId: string; granteeType: 'doctor' | 'institution'; granteeId: string; granteeName: string; scope: string; purpose: string; active: boolean; grantedAt: string; expiresAt?: string }
export interface EmergencySettings {
  showBloodType: boolean; showAllergies: boolean; showConditions: boolean;
  showMedications: boolean; showContacts: boolean; aiChatbotEnabled: boolean;
}
export interface EmergencyProfile { token: string; patientId: string; nfcUid?: string; qrIssued: boolean; nfcIssued: boolean; activatedAt: string; settings: EmergencySettings; scanCount: number }
export interface Message { id: string; conversationId: string; senderId: string; text: string; sentAt: string; type?: 'text' }
export interface Conversation { id: string; patientId: string; otherUserId: string; otherName: string; role: Role; updatedAt: string }
export interface Notification { id: string; userId: string; title: string; body: string; type: 'lab' | 'message' | 'prescription' | 'system'; read: boolean; createdAt: string }
export interface AuditEntry { id: string; patientId?: string; actor: string; actorName: string; action: string; resource: string; timestamp: string; ip: string; hash: string; previousHash: string }
export interface GuidelineChunk { id: string; text: string; source: string; section: string; tags: string[]; language: Lang; version: string }
export interface ChatTurn { role: 'user' | 'assistant'; text: string; sources?: string[]; confidence?: 'High' | 'Moderate' | 'Low' | 'Knowledge Gap'; disclaimer?: string }
export interface Session { token: string; refreshToken?: string; user: User; expiresAt: string }
