import { Pool } from 'pg';

let pool: Pool | null = null;

export async function initDb(): Promise<Pool> {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is missing.');
  }

  pool = new Pool({
    connectionString,
  });

  // Verify connection and create schema
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        "passwordHash" TEXT NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL CHECK(type IN ('income', 'expense')),
        amount REAL NOT NULL CHECK(amount > 0),
        "categoryId" TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        date TIMESTAMP WITH TIME ZONE NOT NULL,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_transactions_userId ON transactions(user_id);
      CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);

      CREATE TABLE IF NOT EXISTS goals (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        "targetAmount" REAL NOT NULL CHECK("targetAmount" > 0),
        "currentAmount" REAL NOT NULL DEFAULT 0 CHECK("currentAmount" >= 0),
        "targetDate" TIMESTAMP WITH TIME ZONE NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed', 'cancelled')),
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_goals_userId ON goals(user_id);

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT NOT NULL,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        value TEXT NOT NULL,
        PRIMARY KEY (key, user_id)
      );

      CREATE TABLE IF NOT EXISTS ai_history (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK(role IN ('user', 'assistant', 'system')),
        content TEXT NOT NULL,
        "contextSnapshot" TEXT,
        timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_ai_history_userId ON ai_history(user_id);
      ALTER TABLE ai_history ADD COLUMN IF NOT EXISTS "goal_id" TEXT;
      CREATE INDEX IF NOT EXISTS idx_ai_history_goalId ON ai_history(goal_id);
      ALTER TABLE users ADD COLUMN IF NOT EXISTS "email_verified" BOOLEAN DEFAULT false;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS "verification_token_hash" TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS "verification_token_expires_at" TIMESTAMP WITH TIME ZONE;
      
      ALTER TABLE users ADD COLUMN IF NOT EXISTS "password_reset_token_hash" TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS "password_reset_token_expires_at" TIMESTAMP WITH TIME ZONE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS "username" TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS "avatar_url" TEXT;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS "google_id" TEXT;
      
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_lower ON users(LOWER(username)) WHERE username IS NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id) WHERE google_id IS NOT NULL;
      
      CREATE TABLE IF NOT EXISTS feedback (
        id TEXT PRIMARY KEY,
        user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
        type TEXT NOT NULL,
        message TEXT NOT NULL,
        rating INTEGER,
        platform TEXT,
        app_version TEXT,
        contact_email TEXT,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- ─── Feature 1: SPR Marketplace ─────────────────────────────────────
      CREATE TABLE IF NOT EXISTS marketplace_listings (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        category TEXT NOT NULL,
        condition TEXT NOT NULL,
        price REAL NOT NULL CHECK(price >= 0),
        images TEXT[] NOT NULL DEFAULT '{}',
        status TEXT NOT NULL DEFAULT 'available' CHECK(status IN ('available', 'pending_handover', 'sold', 'removed')),
        contact_info TEXT NOT NULL DEFAULT '',
        buyer_interest_count INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_marketplace_user_id ON marketplace_listings(user_id);
      CREATE INDEX IF NOT EXISTS idx_marketplace_status ON marketplace_listings(status);
      CREATE INDEX IF NOT EXISTS idx_marketplace_category ON marketplace_listings(category);

      CREATE TABLE IF NOT EXISTS marketplace_interests (
        id TEXT PRIMARY KEY,
        listing_id TEXT NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL DEFAULT '',
        contact TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_listing_user_interest UNIQUE(listing_id, user_id)
      );

      CREATE INDEX IF NOT EXISTS idx_marketplace_interests_listing ON marketplace_interests(listing_id);

      CREATE TABLE IF NOT EXISTS marketplace_reports (
        id TEXT PRIMARY KEY,
        listing_id TEXT NOT NULL REFERENCES marketplace_listings(id) ON DELETE CASCADE,
        reporter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reason TEXT NOT NULL,
        details TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- ─── Feature 2: SPR Projects ─────────────────────────────────────────
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        category TEXT NOT NULL,
        difficulty TEXT NOT NULL CHECK(difficulty IN ('Beginner', 'Intermediate', 'Advanced')),
        estimated_budget REAL NOT NULL DEFAULT 0,
        estimated_days INTEGER NOT NULL DEFAULT 1,
        materials TEXT NOT NULL DEFAULT '[]',
        steps TEXT NOT NULL DEFAULT '[]',
        expected_outcome TEXT NOT NULL DEFAULT '',
        resources TEXT NOT NULL DEFAULT '[]',
        images TEXT[] NOT NULL DEFAULT '{}',
        is_premium BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_projects_category ON projects(category);
      CREATE INDEX IF NOT EXISTS idx_projects_difficulty ON projects(difficulty);

      CREATE TABLE IF NOT EXISTS user_subscriptions (
        user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        plan TEXT NOT NULL DEFAULT 'free' CHECK(plan IN ('free', 'premium')),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS project_ai_history (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK(role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_project_ai_history_user_proj ON project_ai_history(user_id, project_id);

      -- ─── Feature 3: 🌳RYLAND (Student Bill Sponsorship) ───────────────────
      CREATE TABLE IF NOT EXISTS tryland_requests (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        bill_category TEXT NOT NULL,
        amount_requested REAL NOT NULL CHECK(amount_requested > 0),
        amount_funded REAL NOT NULL DEFAULT 0 CHECK(amount_funded >= 0),
        explanation TEXT NOT NULL DEFAULT '',
        due_date TIMESTAMP WITH TIME ZONE NOT NULL,
        document_url TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'pending_verification' CHECK(status IN ('pending_verification', 'open', 'approved', 'rejected', 'partially_funded', 'fully_funded', 'completed')),
        rejection_reason TEXT,
        verified_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_tryland_user ON tryland_requests(user_id);
      CREATE INDEX IF NOT EXISTS idx_tryland_status ON tryland_requests(status);
      CREATE INDEX IF NOT EXISTS idx_tryland_category ON tryland_requests(bill_category);

      CREATE TABLE IF NOT EXISTS tryland_sponsorships (
        id TEXT PRIMARY KEY,
        request_id TEXT NOT NULL REFERENCES tryland_requests(id) ON DELETE CASCADE,
        sponsor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount REAL NOT NULL CHECK(amount > 0),
        note TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'pledged',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_tryland_sponsorships_req ON tryland_sponsorships(request_id);
      CREATE INDEX IF NOT EXISTS idx_tryland_sponsorships_sponsor ON tryland_sponsorships(sponsor_id);

      -- ─── Feature 4: SPR Donate (Donations & Fundraising) ─────────────────
      CREATE TABLE IF NOT EXISTS donate_campaigns (
        id TEXT PRIMARY KEY,
        organizer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        organizer_name TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        objective TEXT NOT NULL DEFAULT '',
        target_amount REAL NOT NULL CHECK(target_amount > 0),
        amount_raised REAL NOT NULL DEFAULT 0 CHECK(amount_raised >= 0),
        cover_image TEXT NOT NULL DEFAULT '',
        category TEXT NOT NULL DEFAULT 'Student Welfare',
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'completed', 'cancelled')),
        end_date TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_donate_status ON donate_campaigns(status);
      CREATE INDEX IF NOT EXISTS idx_donate_category ON donate_campaigns(category);

      CREATE TABLE IF NOT EXISTS donations (
        id TEXT PRIMARY KEY,
        campaign_id TEXT NOT NULL REFERENCES donate_campaigns(id) ON DELETE CASCADE,
        donor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        amount REAL NOT NULL CHECK(amount > 0),
        message TEXT NOT NULL DEFAULT '',
        is_anonymous BOOLEAN NOT NULL DEFAULT false,
        status TEXT NOT NULL DEFAULT 'pledged',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_donations_campaign ON donations(campaign_id);
      CREATE INDEX IF NOT EXISTS idx_donations_donor ON donations(donor_id);

      ALTER TABLE users ADD COLUMN IF NOT EXISTS "role" TEXT NOT NULL DEFAULT 'user';

      -- Ensure paulwanmarat@gmail.com is designated as the permanent Owner of the application
      UPDATE users 
      SET role = 'owner', email_verified = true 
      WHERE LOWER(email) = 'paulwanmarat@gmail.com';

      CREATE TABLE IF NOT EXISTS admin_audit_logs (
        id TEXT PRIMARY KEY,
        actor_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        actor_email TEXT NOT NULL,
        action TEXT NOT NULL,
        target_email TEXT NOT NULL,
        details TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_actor ON admin_audit_logs(actor_id);

      -- ─── QR Payment extensions for 🌳RYLAND sponsorships ───
      ALTER TABLE tryland_sponsorships ADD COLUMN IF NOT EXISTS payment_reference TEXT UNIQUE;
      ALTER TABLE tryland_sponsorships ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'promptpay_qr';
      ALTER TABLE tryland_sponsorships ADD COLUMN IF NOT EXISTS slip_url TEXT;
      ALTER TABLE tryland_sponsorships ADD COLUMN IF NOT EXISTS slip_reference TEXT;
      ALTER TABLE tryland_sponsorships ADD COLUMN IF NOT EXISTS transfer_time TIMESTAMP WITH TIME ZONE;
      ALTER TABLE tryland_sponsorships ADD COLUMN IF NOT EXISTS verified_by TEXT REFERENCES users(id);
      ALTER TABLE tryland_sponsorships ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;
      ALTER TABLE tryland_sponsorships ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
      CREATE INDEX IF NOT EXISTS idx_tryland_sponsorships_status ON tryland_sponsorships(status);
      CREATE INDEX IF NOT EXISTS idx_tryland_sponsorships_ref ON tryland_sponsorships(payment_reference);

      -- ─── QR Payment extensions for SPR Donate donations ───
      ALTER TABLE donations ADD COLUMN IF NOT EXISTS payment_reference TEXT UNIQUE;
      ALTER TABLE donations ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'promptpay_qr';
      ALTER TABLE donations ADD COLUMN IF NOT EXISTS slip_url TEXT;
      ALTER TABLE donations ADD COLUMN IF NOT EXISTS slip_reference TEXT;
      ALTER TABLE donations ADD COLUMN IF NOT EXISTS transfer_time TIMESTAMP WITH TIME ZONE;
      ALTER TABLE donations ADD COLUMN IF NOT EXISTS verified_by TEXT REFERENCES users(id);
      ALTER TABLE donations ADD COLUMN IF NOT EXISTS verified_at TIMESTAMP WITH TIME ZONE;
      ALTER TABLE donations ADD COLUMN IF NOT EXISTS rejection_reason TEXT;
      CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(status);
      CREATE INDEX IF NOT EXISTS idx_donations_ref ON donations(payment_reference);

      -- ─── Guest Supporter & Pure 0 Initial State Migrations ───
      ALTER TABLE donations ALTER COLUMN donor_id DROP NOT NULL;
      ALTER TABLE tryland_sponsorships ALTER COLUMN sponsor_id DROP NOT NULL;
      ALTER TABLE donations ADD COLUMN IF NOT EXISTS guest_name TEXT;
      ALTER TABLE donations ADD COLUMN IF NOT EXISTS guest_email TEXT;
      ALTER TABLE tryland_sponsorships ADD COLUMN IF NOT EXISTS guest_name TEXT;
      ALTER TABLE tryland_sponsorships ADD COLUMN IF NOT EXISTS guest_email TEXT;

      -- Reset all seeded figures to 0 (all numbers start clean from 0)
      UPDATE donate_campaigns SET amount_raised = 0 WHERE NOT EXISTS (
        SELECT 1 FROM donations WHERE campaign_id = donate_campaigns.id AND status = 'verified'
      );
      UPDATE tryland_requests SET amount_funded = 0, status = 'open' WHERE NOT EXISTS (
        SELECT 1 FROM tryland_sponsorships WHERE request_id = tryland_requests.id AND status = 'verified'
      );

      -- Remove any test/made-up donations (such as 300 baht tester user)
      DELETE FROM donations WHERE amount = 300 OR message ILIKE '%tester%' OR message ILIKE '%made up%';
      DELETE FROM tryland_sponsorships WHERE amount = 300;
    `);

    // Ensure Campus Food Pantry Winter Supply campaign exists (from advisor's transfer slip)
    await client.query(`
      INSERT INTO donate_campaigns 
        (id, organizer_id, organizer_name, title, description, objective, target_amount, amount_raised, cover_image, category, status)
      VALUES (
        'camp_pantry_winter',
        'system_organizer',
        'Student Welfare Union',
        'Campus Food Pantry Winter Supply',
        'Providing supplemental nutritious meals and emergency grocery packs to students living on campus during winter term.',
        'Support campus dorm students with nutritious groceries and emergency meals.',
        5000,
        0,
        'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800',
        'Student Welfare',
        'active'
      )
      ON CONFLICT (id) DO UPDATE SET title = 'Campus Food Pantry Winter Supply';

      -- Ensure Mr. Anthony's ฿100 TrueMoney payment (ref 50060248100418) is recorded in pending verification
      INSERT INTO donations
        (id, campaign_id, donor_id, amount, message, is_anonymous, status, payment_reference, payment_method, slip_reference, transfer_time, guest_name)
      VALUES (
        'don_anthony_100',
        'camp_pantry_winter',
        NULL,
        100.00,
        'True Money',
        false,
        'pending',
        'DON-2K38SK',
        'promptpay_qr',
        '50060248100418',
        '2026-11-06T22:38:45+07:00',
        'Anthony Jose Ferrer'
      )
      ON CONFLICT (payment_reference) DO NOTHING;
    `);

    // Seed initial projects if empty
    const projCount = await client.query('SELECT COUNT(*) FROM projects');
    if (parseInt(projCount.rows[0].count, 10) === 0) {
      await seedProjects(client);
    }

    // Seed initial donate campaigns if empty
    const campCount = await client.query('SELECT COUNT(*) FROM donate_campaigns');
    if (parseInt(campCount.rows[0].count, 10) === 0) {
      await seedCampaigns(client);
    }

    // Seed initial tryland requests if empty
    const reqCount = await client.query('SELECT COUNT(*) FROM tryland_requests');
    if (parseInt(reqCount.rows[0].count, 10) === 0) {
      await seedTrylandRequests(client);
    }
  } finally {
    client.release();
  }

  return pool;
}

async function seedProjects(client: any) {
  const sampleProjects = [
    {
      id: 'proj_dorm_energy',
      title: 'ESP32 Smart Dorm Energy Monitor',
      description: 'Build an IoT power monitor using ESP32 and non-invasive current sensors to track appliance electricity consumption and lower student dormitory utility bills.',
      category: 'Tech & Coding',
      difficulty: 'Beginner',
      estimated_budget: 380,
      estimated_days: 5,
      materials: JSON.stringify([
        { name: 'ESP32 Development Board (NodeMCU-32S)', estCost: 150, source: 'Campus Maker Lab / Online' },
        { name: 'SCT-013-000 Non-invasive AC Current Sensor', estCost: 180, source: 'Electronics Supply' },
        { name: '10μF Capacitor & 10kΩ Bias Resistors', estCost: 20, source: 'Lab Component Bin' },
        { name: '3.5mm Audio Jack Breakout & Jumper Wires', estCost: 30, source: 'General Store' }
      ]),
      steps: JSON.stringify([
        {
          title: 'Introduction & AC Sensing Principles',
          detail: 'Learn how split-core current transformers measure electromagnetic fields around AC mains without stripping insulated wires. Calculate power wattage formula (P = V_rms * I_rms * PF).'
        },
        {
          title: 'Voltage Divider & Analog Conditioning Circuit',
          detail: 'Construct a 1.65V DC midpoint bias circuit so the alternating sine wave output of the SCT-013 fits safely into the 0V–3.3V ESP32 ADC range.'
        },
        {
          title: 'Firmware & EmonLib Sampling',
          detail: 'Install the open-source EmonLib library on Arduino IDE. Calibrate the current transformer constant and take 1480 analog samples per electrical cycle.'
        },
        {
          title: 'Local Wi-Fi Telemetry & Web Dashboard',
          detail: 'Set up ESP32 async web server or MQTT client to stream live wattage, daily kilowatt-hours, and estimated Baht costs.'
        },
        {
          title: 'Dorm Appliance Audit & Bill Optimization',
          detail: 'Clamp onto dorm refrigerator, desktop PC, and portable AC lines to identify phantom loads and configure automated phone notifications.'
        }
      ]),
      expected_outcome: 'A self-contained desktop power meter that displays real-time wattage, cumulative electricity consumption, and alerts when exceeding dorm energy caps.',
      resources: JSON.stringify([
        'OpenEnergyMonitor calibration guide: https://learn.openenergymonitor.org',
        'ESP32 ADC linearity compensation notes',
        'Campus Dorm Sustainability Guidelines 2026'
      ]),
      images: ['https://images.unsplash.com/photo-1518770660439-4636190af475?w=800'],
      is_premium: false
    },
    {
      id: 'proj_stem_robotic_arm',
      title: 'Classroom Quad-Servo STEM Robotic Arm',
      description: 'Design a 4-Degree-of-Freedom desktop robotic arm using 3D printed arms or upcycled acrylic and SG90 micro-servos for classroom STEM and kinematics demonstrations.',
      category: 'Robotics & Hardware',
      difficulty: 'Intermediate',
      estimated_budget: 650,
      estimated_days: 12,
      materials: JSON.stringify([
        { name: '4x TowerPro SG90 / MG90S Micro Servos', estCost: 320, source: 'Robotics Store' },
        { name: 'Laser-cut Acrylic or 3D Printed Frame Brackets', estCost: 180, source: 'University FabLab' },
        { name: 'Arduino Nano / RP2040 Board', estCost: 100, source: 'Maker Supplies' },
        { name: 'PCA9685 16-channel I2C Servo Driver', estCost: 50, source: 'Electronics Supply' }
      ]),
      steps: JSON.stringify([
        {
          title: 'Kinematics Overview & Linkage Layout',
          detail: 'Understand forward and inverse kinematics on 2D planes. Calculate torque requirements on shoulder and elbow joints.'
        },
        {
          title: 'Frame Assembly & Servo Centering',
          detail: 'Assemble laser-cut acrylic linkages. Center all servo splines at 90 degrees before screwing in horns to prevent stripping.'
        },
        {
          title: 'I2C Servo Driver & Power Isolation',
          detail: 'Power logic from micro USB while supplying 5V 2A external DC power to avoid voltage sags when multiple servos move concurrently.'
        },
        {
          title: 'Trajectory Interpolation & Pick-and-Place Logic',
          detail: 'Write smooth cubic spline acceleration curves to gently pick, transfer, and sort small 30g foam blocks.'
        },
        {
          title: 'Potentiometer Mimicry / Gamepad Control',
          detail: 'Connect dual analog joysticks to control gripper position in intuitive Cartesian coordinates.'
        }
      ]),
      expected_outcome: 'A functioning 4-axis tabletop robotic arm with repeatable precision pick-and-place operation and joystick manual override.',
      resources: JSON.stringify([
        'Inverse Kinematics geometric derivation cheatsheet',
        'PCA9685 Adafruit Servo Library Docs',
        'Thingiverse 4-DOF Arm STL files'
      ]),
      images: ['https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800'],
      is_premium: false
    },
    {
      id: 'proj_campus_market_app',
      title: 'Campus Peer Secondhand Exchange Architecture',
      description: 'Develop an authenticated peer-to-peer student marketplace platform with verified university credentials, zero fees, and safe campus pickup spot mapping.',
      category: 'Business & Startup',
      difficulty: 'Intermediate',
      estimated_budget: 0,
      estimated_days: 14,
      materials: JSON.stringify([
        { name: 'Node.js & Express / PostgreSQL Backend', estCost: 0, source: 'Open Source' },
        { name: 'React Native / Expo Universal Frontend', estCost: 0, source: 'Open Source' },
        { name: 'Free Cloud Hosting (Render / Supabase)', estCost: 0, source: 'Developer Tier' }
      ]),
      steps: JSON.stringify([
        {
          title: 'Market Validation & Campus User Interviews',
          detail: 'Survey 50+ dormitory students about unwanted textbooks, lab coats, and monitors. Quantify friction with general social media groups.'
        },
        {
          title: 'Relational Database Schema Design',
          detail: 'Model normalized tables for listings, condition tags, buyer inquiries, and safety moderation flags with audit logs.'
        },
        {
          title: 'Student Identity Verification & Privacy Protection',
          detail: 'Enforce institutional student email verification while masking personal phone numbers until mutually confirmed handover.'
        },
        {
          title: 'Handover Security & Campus Safe Zones',
          detail: 'Integrate verified safe pickup spots (university library front desk, campus security kiosk) with timestamped receipt logs.'
        },
        {
          title: 'Pilot Launch & Circular Economy Metrics',
          detail: 'Deploy to campus beta testers and measure total student baht saved and waste diverted.'
        }
      ]),
      expected_outcome: 'A full-stack, deployed peer exchange application ready for campus beta trials with student security safeguards.',
      resources: JSON.stringify([
        'Platform Trust & Safety Best Practices Guide',
        'PostgreSQL full-text search indexing reference',
        'Student Enterprise Case Studies 2026'
      ]),
      images: ['https://images.unsplash.com/photo-1556742049-0a67e557224f?w=800'],
      is_premium: false
    },
    {
      id: 'proj_solar_hydroponics',
      title: 'Automated Solar Hydroponic Greens Pod',
      description: 'An advanced automated vertical farming pod with solar battery charging, pH/EC nutrient telemetry, and timed sub-irrigation for student dorms or club gardens.',
      category: 'Science & Green Tech',
      difficulty: 'Advanced',
      estimated_budget: 1800,
      estimated_days: 21,
      materials: JSON.stringify([
        { name: '20W Polycrystalline Solar Panel + 12V MPPT Charge Controller', estCost: 650, source: 'Green Energy Lab' },
        { name: '12V 7Ah Sealed AGM Battery', estCost: 450, source: 'Solar Shop' },
        { name: 'Food-grade PVC Vertical Grow Towers & Submersible Pump', estCost: 420, source: 'AgTech Supplies' },
        { name: 'Analog EC & pH Water Sensor Probes + ESP32', estCost: 280, source: 'Scientific Sensors' }
      ]),
      steps: JSON.stringify([
        {
          title: 'Hydrodynamic Design & Nutrient Film Flow',
          detail: 'Size gravity-assisted vertical tower cascade for optimal root oxygenation and 1.2 L/min pump cycling.'
        },
        {
          title: 'Solar Sizing & Autonomous Battery Backup',
          detail: 'Calculate daily watt-hour solar budget to sustain pump duty cycles and sensor telemetry through 3 consecutive rainy days.'
        },
        {
          title: 'Chemical Sensor Calibration (pH & Electrical Conductivity)',
          detail: 'Calibrate glass pH probe in pH 4.01/6.86 buffer solutions and configure automatic temperature compensation.'
        },
        {
          title: 'Closed-Loop Nutrient Dosing & Solenoid Controls',
          detail: 'Implement PID feedback control to trigger micro peristaltic dosing pumps when nutrient levels dip below target PPM.'
        },
        {
          title: 'Crop Harvesting & Student Cost per Kilogram',
          detail: 'Track 28-day harvest yields of Italian basil and lettuce, comparing organic grocery prices against electrical amortized costs.'
        }
      ]),
      expected_outcome: 'A self-sustaining, solar-powered vertical hydroponics tower capable of producing fresh greens with automated water and nutrient regulation.',
      resources: JSON.stringify([
        'FAO Hydroponic Crop Management Manual',
        'MPPT charge controller efficiency curves',
        'Nutrient solution chemical formulations for leafy greens'
      ]),
      images: ['https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?w=800'],
      is_premium: true
    },
    {
      id: 'proj_ai_receipt_auditor',
      title: 'Edge AI Visual Receipt & Ledger Audit Bot',
      description: 'Deploy an edge-accelerated computer vision model to parse crumpled paper receipts and verify student council club expense reports against budget caps.',
      category: 'Programming & AI',
      difficulty: 'Advanced',
      estimated_budget: 450,
      estimated_days: 18,
      materials: JSON.stringify([
        { name: 'Raspberry Pi 4 / High-Res Camera Module or Phone OCR', estCost: 350, source: 'CS Dept Lab' },
        { name: 'Lightweight LayoutLM / Tesseract OCR Pipeline', estCost: 0, source: 'Hugging Face' },
        { name: 'Cloud Gemini / Local LLM Token Budget', estCost: 100, source: 'API Developer Credit' }
      ]),
      steps: JSON.stringify([
        {
          title: 'Image Preprocessing & Perspective Transform',
          detail: 'Apply OpenCV adaptive thresholding and homography 4-point corner rectification to flatten warped paper receipts.'
        },
        {
          title: 'Hybrid OCR & Bounding Box Extraction',
          detail: 'Combine localized OCR bounding boxes with text confidence scores to extract line items, quantities, and vat breakdowns.'
        },
        {
          title: 'Semantic Field Extraction with LLM Guardrails',
          detail: 'Prompt structured JSON generation to accurately separate tax ID, vendor name, line-item totals, and final cash payment.'
        },
        {
          title: 'Club Treasury Rule Validation & Double-Spend Checks',
          detail: 'Verify timestamp overlaps, detect duplicate receipts across separate club claims, and flag prohibited purchases automatically.'
        },
        {
          title: 'Integration with SPR Financial Ledger',
          detail: 'Automatically populate transactions directly into the club treasurer SPR account with attached visual audit proof.'
        }
      ]),
      expected_outcome: 'An end-to-end audit bot that transforms receipt photos into structured audit records and flags unauthorized student club budget expenditures.',
      resources: JSON.stringify([
        'OpenCV document scanner tutorial',
        'Structured Output extraction with Gemini Function Calling',
        'Student Council Treasury Auditing Standards'
      ]),
      images: ['https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=800'],
      is_premium: true
    }
  ];

  for (const p of sampleProjects) {
    await client.query(`
      INSERT INTO projects 
      (id, title, description, category, difficulty, estimated_budget, estimated_days, materials, steps, expected_outcome, resources, images, is_premium)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (id) DO NOTHING
    `, [
      p.id,
      p.title,
      p.description,
      p.category,
      p.difficulty,
      p.estimated_budget,
      p.estimated_days,
      p.materials,
      p.steps,
      p.expected_outcome,
      p.resources,
      p.images,
      p.is_premium
    ]);
  }
}

async function seedCampaigns(client: any) {
  // Find or create an official organizer ID (first user or system organizer)
  const userRes = await client.query('SELECT id, username FROM users LIMIT 1');
  const organizerId = userRes.rows.length > 0 ? userRes.rows[0].id : 'system_organizer';
  const organizerName = userRes.rows.length > 0 ? (userRes.rows[0].username || 'SPR Student Union') : 'SPR Student Union';

  const sampleCampaigns = [
    {
      id: 'camp_textbook_bank',
      title: 'Emergency Student Calculator & Textbook Loan Bank',
      description: 'Fund purchase of expensive scientific graphing calculators, required engineering math textbooks, and protective lab gear lent completely free of charge to students facing unexpected financial emergencies.',
      objective: 'Equip over 40 students with semester-long access to essential STEM coursework materials without out-of-pocket costs.',
      target_amount: 15000,
      amount_raised: 0,
      cover_image: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?w=800',
      category: 'Student Welfare'
    },
    {
      id: 'camp_solar_bench',
      title: 'Campus Solar Study Bench & Mobile Charging Station',
      description: 'Install an outdoor weather-resistant solar study table equipped with USB-C fast-charging ports, shaded desk space, and high-efficiency LED reading lamps beside the main student center lawn.',
      objective: 'Create sustainable outdoor study spaces with free solar charging for student laptops and devices between classes.',
      target_amount: 28000,
      amount_raised: 0,
      cover_image: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?w=800',
      category: 'Campus Green Initiative'
    },
    {
      id: 'camp_exam_food_share',
      title: 'End-of-Semester Student Community Food Share',
      description: 'Collect and distribute wholesome pantry essentials, fresh fruit packs, and late-night exam-week nutritional care packages to dorm residents experiencing tight monthly allowances.',
      objective: 'Eliminate exam-week food insecurity for more than 100 on-campus student residents during finals.',
      target_amount: 8000,
      amount_raised: 0,
      cover_image: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800',
      category: 'Emergency Student Aid'
    }
  ];

  for (const c of sampleCampaigns) {
    await client.query(`
      INSERT INTO donate_campaigns
      (id, organizer_id, organizer_name, title, description, objective, target_amount, amount_raised, cover_image, category, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'active')
      ON CONFLICT (id) DO NOTHING
    `, [
      c.id,
      organizerId,
      organizerName,
      c.title,
      c.description,
      c.objective,
      c.target_amount,
      c.amount_raised,
      c.cover_image,
      c.category
    ]);
  }
}

async function seedTrylandRequests(client: any) {
  const userRes = await client.query('SELECT id FROM users LIMIT 1');
  const userId = userRes.rows.length > 0 ? userRes.rows[0].id : 'student_seed_user';

  const sampleRequests = [
    {
      id: 'req_dorm_electricity',
      user_id: userId,
      bill_category: 'Essential Utilities',
      amount_requested: 1850,
      amount_funded: 0,
      explanation: 'Dormitory summer term electric and water meter utility bill for shared room.',
      due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'open'
    },
    {
      id: 'req_engineering_cad',
      user_id: userId,
      bill_category: 'School Supplies',
      amount_requested: 3200,
      amount_funded: 0,
      explanation: 'Semester student license for SolidWorks 3D CAD and machine design coursework coursepack.',
      due_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'open'
    },
    {
      id: 'req_transit_pass',
      user_id: userId,
      bill_category: 'Learning Equipment',
      amount_requested: 1200,
      amount_funded: 0,
      explanation: 'Semester public transit pass between suburban student dorm and engineering workshop campus.',
      due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'open'
    }
  ];

  for (const r of sampleRequests) {
    await client.query(`
      INSERT INTO tryland_requests
      (id, user_id, bill_category, amount_requested, amount_funded, explanation, due_date, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (id) DO NOTHING
    `, [r.id, r.user_id, r.bill_category, r.amount_requested, r.amount_funded, r.explanation, r.due_date, r.status]);
  }
}

export function getDb(): Pool {
  if (!pool) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return pool;
}
