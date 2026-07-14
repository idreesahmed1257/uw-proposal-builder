// Run with: node seed/seedPortfolio.js
// Populates the PortfolioProject collection so your teammate can start
// building the chunking/embedding pipeline against real data right away.

require('dotenv').config();
require('dns').setServers(['8.8.8.8', '8.8.4.4']);
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const PortfolioProject = require('../models/PortfolioProject');

const portfolioProjects = [
    {
        title: 'Visent: Multi-Tenant Visitor Management SaaS with Kiosk Hardware',
        role: 'Full-stack lead: multi-tenant SaaS architecture, Electron kiosk app, biometric verification pipeline',
        description:
            "Visent replaces paper visitor logs at enterprise sites with a multi-tenant SaaS that handles the full journey: pre-registration, QR-based kiosk check-in, real-time staff alerts, and audit-ready logs. I built an Electron kiosk app that talks directly to thermal printers and RFID readers, layered face-api.js with AWS Rekognition for biometric verification, and shipped JWT auth with role-based access control. Isolated data environments per tenant, instant badge printing on arrival, and fire roll-call visibility for emergency on-site personnel tracking.",
        skillsAndDeliverables: [
            'Multi-tenant SaaS architecture (React.js, Node.js, MongoDB)',
            'Electron kiosk app with thermal printer and RFID integration',
            'Biometric verification (face-api.js + AWS Rekognition)',
            'JWT authentication and role-based access control',
            'Real-time staff portal and compliance audit logs',
        ],
        tags: ['SaaS', 'Multi-tenant', 'Electron', 'Biometrics', 'MongoDB', 'React'],
        industry: 'Enterprise / Security & Facilities',
    },
    {
        title: 'Henrietta: AI-First Multi-Tenant HR Platform with Voice Assistant',
        role: 'Full-stack and AI engineering: RAG, GPT-4 function calling, real-time voice bot, multi-tenant infra',
        description:
            "Henrietta turns HR from form-filling into conversation. An AI assistant handles leave requests, sickness logs, and policy questions through text and real-time voice, automating 60%+ of routine HR work for early adopters. I built it on Fastify with subdomain-based multi-tenancy, integrated OpenAI GPT-4 with custom function calling so the bot can execute secure HR actions, and shipped a WebSocket voice bot with speech-to-text and text-to-speech. RAG-powered policy intelligence returns accurate answers to complex HR questions instantly.",
        skillsAndDeliverables: [
            'AI assistant with GPT-4 function calling and RAG',
            'Real-time voice bot (WebSockets, STT, TTS)',
            'Multi-tenant SaaS with subdomain routing',
            'Conversational onboarding and document handling',
            'Policy intelligence engine',
        ],
        tags: ['AI', 'RAG', 'GPT-4', 'Voice', 'HR Tech', 'Fastify', 'Multi-tenant'],
        industry: 'HR Tech / SaaS',
    },
    {
        title: 'Drive Direct: Vehicle Appraisal App with GPS Tracking and Offline Sync',
        role: 'Full-stack and mobile lead: React Native app, GPS tracking, offline data sync, geo-verification',
        description:
            "Drive Direct replaces spreadsheet-based field workflows with a structured digital platform for remote appraisers. The React Native app captures inspection data offline and syncs automatically when devices reconnect, eliminating data loss in low-connectivity sites. GPS-based vehicle tracking with background task management gives operations real-time visibility into assessor locations, while structured digital forms standardize data entry. Result: 50% reduction in manual overhead, 100% security risk elimination, and a fully digitized appraisal workflow.",
        skillsAndDeliverables: [
            'React Native mobile app with offline-first sync',
            'GPS tracking and background location services',
            'Structured digital inspection forms (React Hook Form, Zod)',
            'Real-time field operations dashboard (React.js)',
            'Geo-verified, audit-ready reporting pipeline',
        ],
        tags: ['React Native', 'Mobile', 'GPS', 'Offline-first', 'Field Ops'],
        industry: 'Automotive / Field Services',
    },
    {
        title: 'Hyndburn Pantry: RFID-Integrated Welfare Management Desktop App',
        role: 'Full-stack and hardware integration: Electron desktop app, RFID reader integration, member lifecycle',
        description:
            "The Hyndburn Food Pantry needed to retire spreadsheet tracking and speed up member check-ins for a high-volume community food distribution service. I built a cross-platform Electron desktop app that bridges to RFID readers for instant member identification on arrival, cutting check-in times by approximately 70%. The first version inherited from another vendor did not meet the quality bar, so I rebuilt from scratch in late 2024 with a cleaner architecture: Fastify backend, role-based staff workflows, and a reliable on-site experience that operates even under spotty connectivity.",
        skillsAndDeliverables: [
            'Electron cross-platform desktop app',
            'RFID hardware integration (serial communication)',
            'Role-based staff workflow and access control',
            'Fastify backend with MongoDB',
            'Full ground-up rebuild after vendor handover',
        ],
        tags: ['Electron', 'RFID', 'Desktop App', 'Fastify', 'MongoDB', 'Nonprofit'],
        industry: 'Nonprofit / Community Welfare',
    },
    {
        title: 'Benefit Mankind: Unified Charity Donation Platform (Web and Mobile)',
        role: 'Full-stack and mobile lead: cross-platform JWT, Stripe Payment Sheet, GDPR and PCI DSS compliance',
        description:
            "I consolidated a fragmented WordPress site and React Native mobile apps into one ecosystem for a UK humanitarian charity. A unified JWT auth layer syncs accounts across web and mobile, eliminating credential friction. Native Apple Pay and Google Pay via Stripe Payment Sheet, combined with a 3-step donation flow and Gift Aid collection, cut donation drop-offs by 40% and brought average payment completion under 2 seconds. The platform shipped fully PCI DSS and GDPR compliant, with 99.9% uptime on DigitalOcean and 95+ Lighthouse scores across devices.",
        skillsAndDeliverables: [
            'React Native mobile + React.js web ecosystem',
            'Stripe Payment Sheet with Apple Pay and Google Pay',
            'Cross-platform JWT authentication sync',
            'PCI DSS and GDPR compliance implementation',
            'Real-time admin dashboard with donor analytics',
        ],
        tags: ['React Native', 'Stripe', 'Payments', 'Compliance', 'Nonprofit'],
        industry: 'Charity / Nonprofit',
    },
    {
        title: 'Dubaianer: Luxury Real Estate Discovery Platform for Dubai Market',
        role: 'Full-stack engineering: Next.js frontend, Fastify backend, MongoDB indexing, lead-gen optimization',
        description:
            "Dubaianer is a premium real estate discovery engine for Dubai's luxury market, combining a fast buyer-facing frontend with an admin management suite. I unified scattered Dubai listings into a single structured catalog, added advanced filters for price, neighborhood, and property type, and built conversion-focused landing pages designed for lead capture. Optimized MongoDB indexing delivers sub-second search results across thousands of listings, while Cloudinary handles media optimization and Mapbox GL powers location browsing.",
        skillsAndDeliverables: [
            'Next.js App Router with Redux Toolkit',
            'Optimized MongoDB indexing for sub-second search',
            'Conversion-focused lead capture UI',
            'Mapbox GL geospatial property browsing',
            'Cloudinary media optimization pipeline',
        ],
        tags: ['Next.js', 'Real Estate', 'MongoDB', 'Mapbox', 'Lead Generation'],
        industry: 'Real Estate',
    },
    {
        title: 'Social Bevy: Location-Based Social Discovery App with AI Mascot',
        role: 'Frontend engineering and product architecture: Socket.IO real-time, Xano backend, discovery UX',
        description:
            "Social Bevy is a city-based social discovery platform connecting users with the best restaurants, cafes, and local hangouts based on real social signals rather than generic anonymous reviews. The product brings together three audiences: users seeking trusted picks, vendors wanting visibility, and influencers shaping local discovery. At the center is Genie, a mascot-led recommendation assistant that personalizes suggestions on where to go and what to try. Built with Tailwind and Socket.IO for real-time interaction, with Xano powering the API-driven backend.",
        skillsAndDeliverables: [
            'Real-time discovery UX (Socket.IO)',
            'Xano API-driven backend architecture',
            'Three-sided marketplace design (users / vendors / influencers)',
            'Mascot-led recommendation assistant',
            'City-based location discovery system',
        ],
        tags: ['Socket.IO', 'Xano', 'Social', 'Marketplace', 'AI Assistant'],
        industry: 'Social / Consumer',
    },
    {
        title: 'BData: Real-Time Device Monitoring System with Zero Trust Architecture',
        role: 'Technical Lead – Full-stack, microservices architecture, DevOps, and infrastructure on GCP',
        description:
            "BData is an enterprise-grade real-time device monitoring platform built on a Zero Trust Security Model, where every device and service must continuously authenticate. As the sole engineer, I designed and built dedicated microservices for authentication, platform APIs, real-time analytics, anomaly detection, database dumps, and a Blockchain PoC — all orchestrated via Docker Compose on GCP. An MQTT-to-Kafka pipeline handles high-throughput data ingestion across services, while Socket.io pushes live updates to a React and Redux Saga frontend. MongoDB handles persistent storage, and MUI delivers a clean, responsive monitoring interface.",
        skillsAndDeliverables: [
            'MQTT-to-Kafka event-driven data ingestion pipeline',
            'Microservices orchestration via Docker Compose on GCP',
            'Socket.io real-time frontend with Redux Saga',
            'Zero Trust authentication microservice',
            'Blockchain Proof of Concept integration',
        ],
        tags: ['Microservices', 'GCP', 'MQTT', 'Kafka', 'Zero Trust', 'IoT', 'DevOps'],
        industry: 'IoT / Enterprise Infrastructure',
    },
    // Add more portfolio projects here as objects in this same shape.
];

const runSeed = async () => {
    await connectDB();
    try {
        await PortfolioProject.deleteMany({}); // wipe before reseeding — remove if you don't want that
        const created = await PortfolioProject.insertMany(portfolioProjects);
        console.log(`Seeded ${created.length} portfolio project(s).`);
    } catch (err) {
        console.error('Seeding failed:', err.message);
    } finally {
        await mongoose.connection.close();
    }
};

runSeed();