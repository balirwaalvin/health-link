import { Client, Databases, ID, Permission, Role } from 'node-appwrite';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const client = new Client()
    .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT)
    .setProject(process.env.VITE_APPWRITE_PROJECT_ID)
    .setKey(process.env.APPWRITE_API_KEY);

const databases = new Databases(client);

async function setup() {
    try {
        console.log("Setting up Appwrite Database...");
        
        let dbId = process.env.VITE_APPWRITE_DATABASE_ID;
        
        if (dbId === 'replace_with_database_id' || !dbId) {
            console.log("Creating new Database 'healthlinkDB'...");
            const db = await databases.create(ID.unique(), 'healthlinkDB');
            dbId = db.$id;
            console.log(`Database created: ${dbId}`);
        } else {
            console.log(`Using existing database: ${dbId}`);
        }

        // Setup Patients
        console.log("Setting up Patients collection...");
        const patients = await databases.createCollection(
            dbId, 
            ID.unique(), 
            'Patients',
            [Permission.read(Role.users()), Permission.write(Role.users())]
        );
        console.log(`Patients collection created: ${patients.$id}`);
        await databases.createStringAttribute(dbId, patients.$id, 'full_name', 255, true);
        await databases.createStringAttribute(dbId, patients.$id, 'display_id', 50, true);
        await databases.createStringAttribute(dbId, patients.$id, 'phone', 50, true);
        await databases.createStringAttribute(dbId, patients.$id, 'email', 255, false);

        // Setup Clinics
        console.log("Setting up Clinics collection...");
        const clinics = await databases.createCollection(
            dbId, 
            ID.unique(), 
            'Clinics',
            [Permission.read(Role.users()), Permission.write(Role.users())]
        );
        console.log(`Clinics collection created: ${clinics.$id}`);
        await databases.createStringAttribute(dbId, clinics.$id, 'clinic_name', 255, true);
        await databases.createStringAttribute(dbId, clinics.$id, 'location', 255, true);
        await databases.createStringAttribute(dbId, clinics.$id, 'contact_phone', 50, true);

        // Setup Visits
        console.log("Setting up Visits collection...");
        const visits = await databases.createCollection(
            dbId, 
            ID.unique(), 
            'Visits',
            [Permission.read(Role.users()), Permission.write(Role.users())]
        );
        console.log(`Visits collection created: ${visits.$id}`);
        await databases.createStringAttribute(dbId, visits.$id, 'diagnosis', 255, true);
        await databases.createStringAttribute(dbId, visits.$id, 'prescription', 1000, true);
        await databases.createStringAttribute(dbId, visits.$id, 'notes', 5000, false);
        await databases.createDatetimeAttribute(dbId, visits.$id, 'visit_date', false);
        await databases.createStringAttribute(dbId, visits.$id, 'patient_id', 255, true);
        await databases.createStringAttribute(dbId, visits.$id, 'clinic_id', 255, true);
        await databases.createStringAttribute(dbId, visits.$id, 'created_by_name', 255, true);

        console.log("=========================================");
        console.log("Setup Complete! Please update your .env.local with these IDs:");
        console.log(`VITE_APPWRITE_DATABASE_ID=${dbId}`);
        console.log(`VITE_APPWRITE_PATIENTS_COLLECTION_ID=${patients.$id}`);
        console.log(`VITE_APPWRITE_CLINICS_COLLECTION_ID=${clinics.$id}`);
        console.log(`VITE_APPWRITE_VISITS_COLLECTION_ID=${visits.$id}`);
        console.log("=========================================");

    } catch (e) {
        console.error("Error setting up database:", e);
    }
}

setup();
