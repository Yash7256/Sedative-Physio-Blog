-- Course Syllabus table (stores detailed syllabus per course for quiz generation)
CREATE TABLE IF NOT EXISTS course_syllabus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id INTEGER NOT NULL,
  topic_name TEXT NOT NULL,
  content TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE course_syllabus ENABLE ROW LEVEL SECURITY;

-- Course Syllabus policies
DROP POLICY IF EXISTS "Users can view course syllabus" ON course_syllabus;
DROP POLICY IF EXISTS "Service role can manage course syllabus" ON course_syllabus;

CREATE POLICY "Users can view course syllabus" ON course_syllabus
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage course syllabus" ON course_syllabus
  USING (auth.role() = 'service_role');

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_course_syllabus_course_id ON course_syllabus(course_id);

-- Insert sample syllabus for Orthopedics Batch (course_id: 1)
INSERT INTO course_syllabus (course_id, topic_name, content, order_index) VALUES
(1, 'Fracture Introduction', 'Definition of fracture, types of fractures (simple, compound, comminuted, greenstick, etc.), causes (traumatic, pathological, stress), fracture healing process (inflammatory, reparative, remodeling phases), factors affecting fracture healing.', 1),
(1, 'Fracture Types & Classification', 'Detailed classification: Based on alignment (displaced, undisplaced), skin integrity (closed, open), pattern (transverse, oblique, spiral), location (epiphyseal, diaphyseal, metaphyseal). Special fractures: Colles, Smith, Monteggia, Galeazzi.', 2),
(1, 'Fracture Healing', 'Stages of bone healing: 1) Hematoma formation (0-3 days) 2) Granulation tissue (3-14 days) 3) Callus formation (2-6 weeks) 4) Lamellar bone deposition (6-12 weeks) 5) Remodeling (months to years). Factors promoting and delaying healing.', 3),
(1, 'Upper Limb Fractures - Humerus', 'Proximal humerus fractures: Neck, greater/lesser tuberosity. Shaft fractures. Supracondylar fractures (pediatric). Clinical features, X-ray findings, management (conservative vs surgical), complications (nerve injury, AVN).', 4),
(1, 'Upper Limb Fractures - Scapula & Clavicle', 'Clavicle fractures: Middle third most common, management with figure-8 bandage or surgical fixation. Scapula fractures: Body, acromion, coracoid process. Glenoid fractures. Associated injuries.', 5),
(1, 'Upper Limb Fractures - Radius & Ulna', 'Forearm fractures: Both bone forearm fractures, isolated radius/ulna fractures. Monteggia fracture-dislocation (proximal ulna + radial head dislocation). Galeazzi fracture-dislocation (distal radius + DRUJ disruption). Nightstick fracture.', 6),
(1, 'Lower Limb Fractures - Hip Bone', 'Acetabular fractures: Posterior wall, anterior column, both column. Pelvic fractures: Anterior-posterior compression, lateral compression, vertical shear. Stable vs unstable pelvis. Management principles, timing of surgery.', 7),
(1, 'Lower Limb Fractures - Femur', 'Femoral neck fractures: Garden classification, Pauwels angle. Intertrochanteric fractures. Subtrochanteric fractures. Shaft fractures. Management: DHS, PFN, intramedullary nailing, hemiarthroplasty. AVN risk in femoral neck.', 8),
(1, 'Lower Limb Fractures - Tibia & Fibula', 'Tibial plateau fractures (Schatzker classification). Tibial shaft fractures (most common long bone fracture). Pilon fractures (tibial plafond). Fibula fractures. Soft tissue management, external fixation, intramedullary nailing.', 9),
(1, 'Osteomyelitis', 'Acute osteomyelitis: Hematogenous spread, clinical presentation (pain, fever, local signs), diagnosis (blood tests, imaging, biopsy), treatment (IV antibiotics, surgical debridement). Chronic osteomyelitis: Sequestrum, involucrum, cloaca formation. Treatment principles.', 10),
(1, 'Bone Tuberculosis', 'Spine TB (Pott spine): Cervical, thoracic, lumbar involvement. Gibbus deformity. Cold abscess. Neurological complications. Hip TB: Early and late stage presentations. Diagnosis: AFB culture, PCR, histopathology. Antitubercular chemotherapy, surgical interventions.', 11),
(1, 'Septic Arthritis', 'Joint infection: Bacterial seeding (hematogenous, direct inoculation, contiguous spread). Clinical features: Pain, swelling, warmth, restricted movement. Investigations: Arthrocentesis, synovial fluid analysis. Management: IV antibiotics, joint aspiration, surgical drainage.', 12),
(1, 'Osteoporosis', 'Definition: Low bone mass with microarchitectural deterioration. Primary osteoporosis: Postmenopausal (Type I), Senile (Type II). Secondary causes. BMD measurement (DEXA scan). T-score and Z-score. Falls risk assessment. Treatment: Bisphosphonates, calcium, vitamin D, exercise.', 13),
(1, 'Osteomalacia & Rickets', 'Vitamin D deficiency disorders. Osteomalacia: Adults, defective mineralization causing bone pain, pseudofractures (Looser zones). Rickets: Children, defective growth plate mineralization causing bowing, cupping, fraying. Radiological features, biochemical findings, treatment.', 14),
(1, 'Metabolic Bone Disorders', 'Renal osteodystrophy: Secondary hyperparathyroidism, osteitis fibrosa cystica. Fluorosis: Endemic fluorosis, skeletal fluorosis, dental fluorosis. Hyperparathyroidism: Primary, secondary, tertiary. Pagets disease: Increased bone turnover, woven bone formation.', 15),
(1, 'Benign Bone Tumors', 'Osteoid osteoma: Night pain, typical location, salicylate response. Osteoblastoma: Larger than 2cm. Osteochondroma: Sessile vs pedunculated, risk of malignant transformation. Enchondroma: Solitary, multiple (Ollier, Maffucci). Giant cell tumor: Epiphyseal location, soap bubble appearance.', 16),
(1, 'Malignant Bone Tumors', 'Osteosarcoma: Most common primary malignant bone tumor, metaphyseal location, Codman triangle, sunburst pattern. Chondrosarcoma: Cartilage matrix, slow growing. Ewing sarcoma: Small round blue cells, onion skin periosteal reaction. Multiple myeloma: Lytic lesions, Bence Jones proteins.', 17),
(1, 'Metastasis in Bone', 'Common primaries: Breast, prostate, lung, kidney, thyroid. Mechanisms: Hematogenous spread. Clinical features: Pain, pathological fractures, hypercalcemia. Investigations: Bone scan, PET-CT, MRI. Management: Bisphosphonates, radiation, surgical stabilization, systemic therapy.', 18),
(1, 'Congenital Talipes Equinovarus (CTEV)', 'Definition: Clubfoot deformity. Etiology: Idiopathic, syndromic, positional. Components: Cavus, forefoot adductus, hindfoot varus, ankle equinus. Pirani scoring. Treatment: Ponseti method (serial casting, tenotomy, bracing). Surgical options for resistant cases.', 19),
(1, 'Poliomyelitis', 'Anterior horn cell disease causing flaccid paralysis. Clinical features: Asymmetric weakness, muscle atrophy, deformities. Classification: Spinal, bulbar, bulbospinal. Assessment: Manual muscle testing, functional grading. Management: Acute phase (immobilization), rehabilitation, orthotics, surgical corrections.', 20),
(1, 'Total Knee Replacement (TKR)', 'Indications: OA, RA, trauma. Components: Femoral, tibial, patellar. Surgical approach: Medial parapatellar, subvastus. Cemented vs cementless. Computer navigation, robotic assisted. Postoperative rehabilitation protocol. Complications: DVT, infection, loosening, stiffness.', 21),
(1, 'ACL Reconstruction', 'Anatomy: AM & PL bundles. Indications: Instability, pivot shift. Graft options: Bone-patellar tendon-bone, hamstrings, allograft. Single vs double bundle. Arthroscopic technique. Postop rehab: phases, timeline, return to sport criteria. Complications.', 22),
(1, 'Osteoarthritis', 'Definition: Degenerative joint disease. Pathophysiology: Cartilage degradation, subchondral changes. Risk factors: Age, obesity, trauma, genetics. Clinical features: Pain (mechanical pattern), stiffness, crepitus. Investigations: X-ray (joint space narrowing, osteophytes). Management: Conservative vs surgical.', 23),
(1, 'Rheumatoid Arthritis', 'Systemic autoimmune inflammatory arthritis. Pathogenesis: Synovitis, pannus formation. Clinical features: Symmetric polyarthritis, morning stiffness, nodules. Investigations: RF, anti-CCP, ESR, CRP. Extra-articular manifestations. DMARDs, biologics. Joint protection, surgery.', 24),
(1, 'Gout', 'Uric acid crystal arthropathy. Pathophysiology: Monosodium urate deposition. Clinical features: Acute monoarticular arthritis, first MTP (podagra), tophi. Investigations: Synovial fluid analysis (negatively birefringent crystals), serum uric acid. Treatment: NSAIDs, colchicine, allopurinol.', 25);
