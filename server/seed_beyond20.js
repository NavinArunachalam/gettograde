const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const AboutDetail = require('./src/models/AboutDetail');
const Milestone = require('./src/models/Milestone');
const ContactDetail = require('./src/models/ContactDetail');
const BlogPost = require('./src/models/BlogPost');
const FacultyMember = require('./src/models/FacultyMember');
const HospitalPartner = require('./src/models/HospitalPartner');
const PlacementStory = require('./src/models/PlacementStory');
const Program = require('./src/models/Program');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("MONGODB_URI is not defined in environment.");
  process.exit(1);
}

const seed = async () => {
  try {
    console.log("Connecting to database...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected successfully.");

    // Delete existing
    console.log("Deleting old documents...");
    await AboutDetail.deleteMany({});
    await Milestone.deleteMany({});
    await ContactDetail.deleteMany({});
    await BlogPost.deleteMany({});
    await FacultyMember.deleteMany({});
    await HospitalPartner.deleteMany({});
    await PlacementStory.deleteMany({});
    await Program.deleteMany({});
    console.log("Old documents deleted.");

    // 1. Seed AboutDetail
    console.log("Seeding AboutDetail...");
    await AboutDetail.create({
      mission: "To equip every learner with practical, industry-ready skills in cloud computing and digital marketing, backed by expert mentorship and real placement outcomes, so that a Beyond20 certificate means something the moment it lands on a recruiter's desk.",
      vision: "To be recognised as a leading name in professional technology and digital marketing training, known for producing job-ready professionals who go on to build careers at India's top MNCs, including Infosys and Wipro.",
      values: "Industry-First Curriculum: Every course is built and continuously updated around real enterprise use cases. Trainer Quality: We only bring in trainers with 15+ years of genuine industry experience. Outcomes: We measure our own success by where our students end up working."
    });

    // 2. Seed Milestone
    console.log("Seeding Milestones...");
    await Milestone.create([
      { year: "2020", title: "Beyond20 Founded", description: "Started with a vision to deliver practical, job-oriented training in cloud technologies and digital marketing." },
      { year: "2022", title: "Enterprise Partnerships", description: "Established direct referral pathways and customized curriculums aligned with top MNC requirements." },
      { year: "2024", title: "1,000+ Alumni Milestone", description: "Successfully placed over 1,000 students at companies like Infosys, Wipro, TCS, and other leading MNCs." },
      { year: "2026", title: "Next Gen Learning Platform", description: "Launched state-of-the-art interactive labs, live cohorts, and certification readiness bootcamps." }
    ]);

    // 3. Seed ContactDetail
    console.log("Seeding ContactDetail...");
    await ContactDetail.create({
      name: "Beyond20",
      url: "beyond20.academy",
      phone: "+91 98765 43210",
      email: "info@beyond20.academy",
      hours: "Monday - Saturday, 9 AM to 7 PM",
      address: "Plot 42, Tech Park, Outer Ring Road, Bengaluru - 560103",
      gst: "29AABCM1234C1ZK",
      timezone: "Asia/Kolkata",
      about: "Welcome to Beyond20 — a professional training academy built for one goal: turning learners into industry-ready professionals."
    });

    // 4. Seed FacultyMember
    console.log("Seeding FacultyMembers...");
    await FacultyMember.create([
      {
        name: "Oracle Cloud Trainer",
        role: "OCI Architect & Lead Mentor",
        specialty: "Oracle Cloud (OCI)",
        years: 15,
        rating: 4.9,
        initials: "OC"
      },
      {
        name: "SAP Trainer",
        role: "SAP Solution Consultant",
        specialty: "SAP (S/4HANA)",
        years: 15,
        rating: 4.9,
        initials: "SP"
      },
      {
        name: "AWS Cloud Trainer",
        role: "AWS DevOps Solutions Architect",
        specialty: "AWS Cloud",
        years: 15,
        rating: 4.8,
        initials: "AW"
      },
      {
        name: "Microsoft Azure Trainer",
        role: "Azure Enterprise Architect",
        specialty: "Microsoft Azure",
        years: 15,
        rating: 4.8,
        initials: "AZ"
      },
      {
        name: "Digital Marketing Trainer",
        role: "Full Stack Growth Marketer",
        specialty: "Digital Marketing",
        years: 15,
        rating: 4.7,
        initials: "DM"
      }
    ]);

    // 5. Seed HospitalPartner
    console.log("Seeding Partners (MNCs)...");
    await HospitalPartner.create([
      { name: "Infosys" },
      { name: "Wipro" },
      { name: "TCS" },
      { name: "Cognizant" },
      { name: "Accenture" },
      { name: "Tech Mahindra" }
    ]);

    // 6. Seed PlacementStory
    console.log("Seeding PlacementStories...");
    await PlacementStory.create([
      { name: "Amit Kumar", role: "Cloud Infrastructure Engineer", hospital: "Wipro", salary: "₹7.5L", city: "Bengaluru" },
      { name: "Sonia Sharma", role: "SAP Associate Consultant", hospital: "Infosys", salary: "₹8.2L", city: "Hyderabad" },
      { name: "Rahul Verma", role: "Performance Marketer", hospital: "Accenture", salary: "₹6.8L", city: "Pune" }
    ]);

    // 7. Seed BlogPost
    console.log("Seeding BlogPosts...");
    await BlogPost.create([
      {
        title: "Oracle Cloud vs AWS vs Azure: Which Certification Should You Choose in 2026?",
        category: "Cloud Computing",
        date: "July 15, 2026",
        readTime: "6 min",
        excerpt: "A practical comparison of Oracle Cloud, AWS and Azure certifications for 2026, and which platform offers the best career fit for your background and goals.",
        featured: true
      },
      {
        title: "SAP S/4HANA Career Guide: Skills, Modules & What to Expect",
        category: "SAP Careers",
        date: "July 12, 2026",
        readTime: "8 min",
        excerpt: "A complete guide to starting a career in SAP S/4HANA, covering the modules to learn, in-demand skills, and what to expect in your first consulting role.",
        featured: false
      },
      {
        title: "5 In-Demand AWS Skills That Get You Hired Faster",
        category: "AWS Cloud",
        date: "July 10, 2026",
        readTime: "5 min",
        excerpt: "A look at the AWS skills recruiters are actively hiring for right now, and how to build them through hands-on projects.",
        featured: false
      },
      {
        title: "From Fresher to Infosys: How Structured Cloud Training Changes Your Career Trajectory",
        category: "Career Guidance",
        date: "July 08, 2026",
        readTime: "7 min",
        excerpt: "How full-fledged, trainer-led cloud training can take a fresher from zero experience to an offer at a top MNC.",
        featured: false
      },
      {
        title: "Digital Marketing Skills That Actually Get You Hired",
        category: "Digital Marketing",
        date: "July 05, 2026",
        readTime: "5 min",
        excerpt: "SEO, performance marketing, or content strategy — which digital marketing skills are recruiters prioritising, and why full-stack marketers stand out.",
        featured: false
      },
      {
        title: "Azure vs AWS: A Beginner's Guide to Choosing Your First Cloud Certification",
        category: "Azure Cloud",
        date: "June 28, 2026",
        readTime: "5 min",
        excerpt: "A beginner-friendly comparison of Azure and AWS certification paths to help new learners choose their starting point.",
        featured: false
      }
    ]);

    // 8. Seed Programs (Courses)
    console.log("Seeding Programs...");
    await Program.create([
      {
        title: "Oracle Cloud Infrastructure (OCI) Training",
        slug: "oracle-cloud-infrastructure-oci-training",
        subtitle: "Master OCI architecture, compute, storage, networking, and database services.",
        description: "Oracle Cloud continues to power mission-critical enterprise workloads across finance, ERP, and database-heavy industries, and skilled OCI professionals are in steady demand. Our full-fledged OCI program takes you from the fundamentals of cloud architecture to advanced enterprise deployment, taught by trainers who have implemented OCI solutions in real production environments.",
        shortDesc: "Complete Oracle Cloud OCI Training from architecture to certification.",
        category: "Cloud Computing",
        specialty: "Oracle Cloud (OCI)",
        status: "published",
        isPublished: true,
        isFeatured: true,
        duration: "8 to 10 weeks",
        rating: 4.8,
        fee: { baseAmount: 25000, gstPercent: 18, emiAvailable: true, scholarshipAvailable: false },
        outcomes: [
          "Complete, structured curriculum aligned with Oracle Cloud certification tracks",
          "Hands-on labs on live OCI environments, not just slides and theory",
          "Real-time project work simulating enterprise cloud migration and deployment",
          "Trainer-led doubt clearing and interview preparation"
        ],
        requirements: ["Basic understanding of IT and computing concepts"],
        syllabus: [
          { moduleNo: 1, moduleTitle: "OCI Fundamentals & Cloud Architecture Concepts", topics: ["Cloud Concepts", "OCI Architecture Overview"], durationHours: 10 },
          { moduleNo: 2, moduleTitle: "Compute, Block, Object & File Storage Services", topics: ["Compute instances", "Storage volumes & object storage"], durationHours: 15 },
          { moduleNo: 3, moduleTitle: "Virtual Cloud Networks (VCN) & Connectivity", topics: ["Subnets", "Route tables", "Internet Gateways"], durationHours: 15 },
          { moduleNo: 4, moduleTitle: "Identity and Access Management (IAM) & Security", topics: ["Users", "Groups", "Policies", "MFA"], durationHours: 10 },
          { moduleNo: 5, moduleTitle: "Oracle Autonomous Database & Database Services", topics: ["Autonomous Database", "ADB deployment"], durationHours: 15 },
          { moduleNo: 6, moduleTitle: "Migration, DevOps & Real-Time Projects", topics: ["On-Prem to OCI migration", "CI/CD", "Capstone Project"], durationHours: 25 }
        ]
      },
      {
        title: "SAP Training (Full-Fledged)",
        slug: "sap-training-full-fledged",
        subtitle: "Functional and technical SAP modules taught through real business-process simulations.",
        description: "SAP remains the backbone of enterprise resource planning for the world's largest organisations, and demand for skilled SAP consultants continues to grow with the shift to S/4HANA. Our full-fledged SAP program covers core functional and technical modules with real business-process simulation, so you graduate with practical, end-to-end implementation experience.",
        shortDesc: "Comprehensive SAP FICO, MM and SD modules, built for S/4HANA-ready careers.",
        category: "Enterprise ERP",
        specialty: "SAP S/4HANA",
        status: "published",
        isPublished: true,
        isFeatured: true,
        duration: "10 to 12 weeks",
        rating: 4.9,
        fee: { baseAmount: 35000, gstPercent: 18, emiAvailable: true, scholarshipAvailable: false },
        outcomes: [
          "End-to-end SAP training, with functional and technical fundamentals covered in depth",
          "Real business-process simulation across procurement, sales, and finance workflows",
          "S/4HANA-focused curriculum aligned with current enterprise adoption",
          "Guidance on module specialisation based on your career goals"
        ],
        requirements: ["Finance, business, or commerce background is helpful but not mandatory"],
        syllabus: [
          { moduleNo: 1, moduleTitle: "SAP Overview & Enterprise Structure", topics: ["ERP concepts", "SAP S/4HANA introduction"], durationHours: 12 },
          { moduleNo: 2, moduleTitle: "SAP FICO (Finance & Controlling) Fundamentals", topics: ["General Ledger", "Accounts Payable", "Asset Accounting"], durationHours: 20 },
          { moduleNo: 3, moduleTitle: "SAP MM (Materials Management) Fundamentals", topics: ["Procurement lifecycle", "Inventory management"], durationHours: 18 },
          { moduleNo: 4, moduleTitle: "SAP SD (Sales & Distribution) Fundamentals", topics: ["Sales orders", "Shipping & Billing"], durationHours: 18 },
          { moduleNo: 5, moduleTitle: "Cross-Module Integration & Business Process Mapping", topics: ["FI-MM-SD integration", "HANA Simple Finance"], durationHours: 15 },
          { moduleNo: 6, moduleTitle: "Real-Time Business Scenario Project", topics: ["End-to-end implementation scenario", "Interview Prep"], durationHours: 25 }
        ]
      },
      {
        title: "AWS Cloud Computing Training",
        slug: "aws-cloud-computing-training",
        subtitle: "From EC2 and S3 to serverless architecture and DevOps pipelines.",
        description: "Amazon Web Services remains the world's most widely adopted cloud platform, and AWS-skilled professionals are among the most sought-after in tech. Our AWS Cloud Computing program takes you from core services through advanced architecture and DevOps automation, with every concept reinforced through hands-on labs.",
        shortDesc: "Complete path to becoming an AWS-skilled professional.",
        category: "Cloud Computing",
        specialty: "AWS Cloud",
        status: "published",
        isPublished: true,
        isFeatured: true,
        duration: "8 to 10 weeks",
        rating: 4.8,
        fee: { baseAmount: 25000, gstPercent: 18, emiAvailable: true, scholarshipAvailable: false },
        outcomes: [
          "Comprehensive coverage from AWS fundamentals to advanced architecture",
          "Hands-on labs on live AWS console environments",
          "Real-time projects covering deployment, scaling, and automation",
          "Structured preparation for industry-recognised AWS certification exams"
        ],
        requirements: ["Basic command line knowledge is a plus"],
        syllabus: [
          { moduleNo: 1, moduleTitle: "AWS Fundamentals & Global Infrastructure", topics: ["Regions & AZs", "Console Overview"], durationHours: 10 },
          { moduleNo: 2, moduleTitle: "EC2, S3, EBS & Core Compute/Storage Services", topics: ["EC2 instances", "S3 buckets", "EBS volumes"], durationHours: 15 },
          { moduleNo: 3, moduleTitle: "VPC, Networking & Security Groups", topics: ["VPC design", "Subnets", "Security Groups"], durationHours: 15 },
          { moduleNo: 4, moduleTitle: "IAM — Identity & Access Management", topics: ["IAM policies", "Roles", "Users"], durationHours: 10 },
          { moduleNo: 5, moduleTitle: "RDS, DynamoDB & Lambda Serverless", topics: ["Databases in AWS", "Serverless Lambda functions"], durationHours: 18 },
          { moduleNo: 6, moduleTitle: "DevOps & CI/CD on AWS", topics: ["CodePipeline", "CloudFormation", "Capstone Project"], durationHours: 25 }
        ]
      },
      {
        title: "Microsoft Azure Cloud Computing Training",
        slug: "microsoft-azure-cloud-computing-training",
        subtitle: "Hands-on training across Azure compute, storage, networking, security, and DevOps.",
        description: "Microsoft Azure powers a massive share of enterprise cloud workloads, especially in organisations already invested in the Microsoft ecosystem. Our Azure Cloud Computing program builds your skills from core fundamentals through enterprise-grade deployment, security, and DevOps, with certification-aligned training throughout.",
        shortDesc: "Enterprise-grade Microsoft Azure training mapped to industry certifications.",
        category: "Cloud Computing",
        specialty: "Microsoft Azure",
        status: "published",
        isPublished: true,
        isFeatured: true,
        duration: "8 to 10 weeks",
        rating: 4.7,
        fee: { baseAmount: 25000, gstPercent: 18, emiAvailable: true, scholarshipAvailable: false },
        outcomes: [
          "Structured curriculum aligned with Azure Fundamentals and Administrator certification tracks",
          "Hands-on labs across compute, storage, networking, and identity services",
          "Real-time project work simulating enterprise Azure deployments",
          "Trainer-led interview and certification preparation"
        ],
        requirements: ["Basic network concepts understanding is recommended"],
        syllabus: [
          { moduleNo: 1, moduleTitle: "Azure Fundamentals & Cloud Concepts", topics: ["Azure global infrastructure", "Subscriptions & Resource Groups"], durationHours: 10 },
          { moduleNo: 2, moduleTitle: "Virtual Machines, Storage Accounts & Disks", topics: ["Azure VMs", "Blob storage", "Managed disks"], durationHours: 15 },
          { moduleNo: 3, moduleTitle: "Azure Virtual Networks & Connectivity", topics: ["VNet peering", "VPN gateway", "ExpressRoute"], durationHours: 15 },
          { moduleNo: 4, moduleTitle: "Azure Active Directory & Identity Management", topics: ["Azure AD", "RBAC", "Enterprise applications"], durationHours: 12 },
          { moduleNo: 5, moduleTitle: "Azure App Services & SQL Database", topics: ["Web apps", "Azure SQL serverless database"], durationHours: 15 },
          { moduleNo: 6, moduleTitle: "Azure DevOps & CI/CD Pipelines", topics: ["Azure Pipelines", "Monitoring & Cost Management", "Capstone Project"], durationHours: 25 }
        ]
      },
      {
        title: "Full Stack Digital Marketing Training",
        slug: "full-stack-digital-marketing-training",
        subtitle: "SEO, SEM, social media, content, analytics and marketing automation.",
        description: "Digital marketing today spans far more than social media posting — it's SEO, paid advertising, analytics, automation, and content strategy working together. Our Full Stack Digital Marketing program covers every pillar of modern marketing, with live campaigns and real client-style projects, so you build a portfolio, not just a certificate.",
        shortDesc: "Complete Full Stack Digital Marketing course with live campaigns.",
        category: "Digital Marketing",
        specialty: "Digital Marketing",
        status: "published",
        isPublished: true,
        isFeatured: true,
        duration: "6 to 8 weeks",
        rating: 4.7,
        fee: { baseAmount: 20000, gstPercent: 18, emiAvailable: true, scholarshipAvailable: false },
        outcomes: [
          "Complete coverage across SEO, SEM, social, content, email and analytics",
          "Live campaign execution on real or simulated ad accounts",
          "Hands-on training on Google Analytics, Google Ads, Meta Ads Manager, and WordPress",
          "Portfolio-building projects designed to showcase to employers or clients"
        ],
        requirements: ["No technical prerequisites, open to all"],
        syllabus: [
          { moduleNo: 1, moduleTitle: "Digital Marketing Fundamentals & Strategy", topics: ["Marketing definitions", "Persona modeling", "Customer journey"], durationHours: 8 },
          { moduleNo: 2, moduleTitle: "Search Engine Optimisation (SEO)", topics: ["On-page SEO", "Off-page link building", "Technical SEO"], durationHours: 15 },
          { moduleNo: 3, moduleTitle: "Search Engine Marketing (SEM) & Google Ads", topics: ["Search campaigns", "Display & Video Ads", "Remarketing"], durationHours: 15 },
          { moduleNo: 4, moduleTitle: "Social Media Marketing (SMM) & Meta Ads", topics: ["Instagram & Facebook strategy", "Meta Ads Manager", "LinkedIn Ads"], durationHours: 15 },
          { moduleNo: 5, moduleTitle: "WordPress, Landing Pages & Email Automation", topics: ["WordPress customization", "Copywriting", "Mailchimp automation"], durationHours: 12 },
          { moduleNo: 6, moduleTitle: "Google Analytics & Live Projects", topics: ["GA4 custom reports", "Conversion tracking", "Live portfolio campaign"], durationHours: 20 }
        ]
      }
    ]);

    console.log("Seed data created successfully.");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
};

seed();
