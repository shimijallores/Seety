import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '..', '..', 'seety.db');
const SCHEMA_PATH = join(__dirname, '..', '..', 'src', 'db', 'schema.sql');

let db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!db) {
    db = new DatabaseSync(DB_PATH);
    // Enable WAL mode and foreign keys
    db.exec('PRAGMA journal_mode = WAL;');
    db.exec('PRAGMA foreign_keys = ON;');
    // Run schema
    const schema = readFileSync(SCHEMA_PATH, 'utf-8');
    db.exec(schema);

    // Seeding Check
    try {
      console.log('Running database seeding checks...');
      
      const seedLocations = [
        {
          name: 'LGU — Antipolo City Hall',
          place_type: 'LGU',
          description: 'Antipolo City Government Headquarters',
          lat: 14.5880,
          lng: 121.1760,
          address: 'M.L. Quezon Ave, Antipolo, Rizal',
          people: [
            { first_name: 'Casimiro', last_name: 'Ynares III', role: 'City Mayor', contact: '0917-123-4567', notes: 'Office of the Mayor' },
            { first_name: 'Renato', last_name: 'Solano', role: 'City Engineer', contact: '02-8697-0362', notes: 'Engineering and Planning Dept' }
          ]
        },
        {
          name: 'LGU — Calamba City Hall',
          place_type: 'LGU',
          description: 'City Government of Calamba Main Building',
          lat: 14.2133,
          lng: 121.1610,
          address: 'Chipeco Ave, Calamba, Laguna',
          people: [
            { first_name: 'Roseller', last_name: 'Rizal', role: 'City Mayor', contact: '0918-999-8888', notes: 'Executive Office' },
            { first_name: 'Alice', last_name: 'Cruz', role: 'Disaster Risk Officer', contact: '049-545-6789', notes: 'Calamba CDRRMO head' }
          ]
        },
        {
          name: 'LGU — Batangas City Hall',
          place_type: 'LGU',
          description: 'Batangas City Hall Complex',
          lat: 13.7565,
          lng: 121.0583,
          address: 'P. Burgos St, Batangas City',
          people: [
            { first_name: 'Beverley', last_name: 'Dimacuha', role: 'City Mayor', contact: '0917-555-6677', notes: 'Office of the Mayor' },
            { first_name: 'Reginald', last_name: 'Santos', role: 'City Legal Officer', contact: '043-723-1234', notes: 'Legal Department' }
          ]
        },
        {
          name: 'LGU — Lucena City Hall',
          place_type: 'LGU',
          description: 'Lucena City Hall Annex',
          lat: 13.9318,
          lng: 121.6135,
          address: 'National Highway, Lucena City, Quezon',
          people: [
            { first_name: 'Mark', last_name: 'Alcala', role: 'City Mayor', contact: '0919-444-3322', notes: 'Office of the Mayor' },
            { first_name: 'Janet', last_name: 'Buelo', role: 'City Health Officer', contact: '042-710-1111', notes: 'City Health Office' }
          ]
        },
        {
          name: 'LGU — Trece Martires City Hall',
          place_type: 'LGU',
          description: 'Cavite Provincial Capitol & Trece Martires City Hall',
          lat: 14.2815,
          lng: 120.8682,
          address: 'Governor\'s Drive, Trece Martires, Cavite',
          people: [
            { first_name: 'Gemma', last_name: 'Lubigan', role: 'City Mayor', contact: '0917-888-7766', notes: 'Office of the Mayor' },
            { first_name: 'Roberto', last_name: 'Dinglasan', role: 'City Treasurer', contact: '046-419-0231', notes: 'Treasury Department' }
          ]
        },
        {
          name: 'AFP Camp — Camp Capinpin',
          place_type: 'AFP_CAMP',
          description: 'Home of the 2nd Infantry "Jungle Fighter" Division, Philippine Army',
          lat: 14.5097,
          lng: 121.3201,
          address: 'Sampaloc, Tanay, Rizal',
          people: [
            { first_name: 'Roy', last_name: 'Galido', role: 'Division Commander', contact: '0905-222-3333', notes: '2ID Headquarters' },
            { first_name: 'John', last_name: 'Alvarez', role: 'Public Affairs Chief', contact: '0916-444-5555', notes: 'Media and Press coordination' }
          ]
        },
        {
          name: 'AFP Camp — Camp Gen. Macario Sakay',
          place_type: 'AFP_CAMP',
          description: 'Active Military Base and Camp Facility',
          lat: 14.1685,
          lng: 121.2435,
          address: 'Los Baños, Laguna',
          people: [
            { first_name: 'Nestor', last_name: 'Perez', role: 'Camp Commander', contact: '0915-777-6655', notes: 'Station command office' },
            { first_name: 'Mario', last_name: 'Lopez', role: 'Security Chief', contact: '0920-111-2222', notes: 'Camp safety operations' }
          ]
        },
        {
          name: 'BFP Station — Lipa City',
          place_type: 'BFP_STATION',
          description: 'Lipa City Fire Station Headquarters',
          lat: 13.9413,
          lng: 121.1620,
          address: 'B. Morada Ave, Lipa City, Batangas',
          people: [
            { first_name: 'Arthur', last_name: 'Brown', role: 'Lipa City Fire Marshal', contact: '0999-555-1234', notes: 'Station commander' },
            { first_name: 'Mark', last_name: 'Davis', role: 'Disaster Lead Responder', contact: '0917-888-2233', notes: 'Emergency response lead' }
          ]
        },
        {
          name: 'BFP Station — Lucena City',
          place_type: 'BFP_STATION',
          description: 'Lucena Central Fire Station',
          lat: 13.9366,
          lng: 121.6160,
          address: 'Quezon Ave, Lucena City, Quezon',
          people: [
            { first_name: 'Dennis', last_name: 'Mabilangan', role: 'Fire Marshal', contact: '0915-333-4455', notes: 'Lucena Central Fire Station' },
            { first_name: 'Grace', last_name: 'Villanueva', role: 'Emergency Analyst', contact: '042-710-2222', notes: 'Disaster Operations' }
          ]
        },
        {
          name: 'BFP Station — Cavite City',
          place_type: 'BFP_STATION',
          description: 'Cavite Central Fire Station',
          lat: 14.4842,
          lng: 120.8988,
          address: 'P. Burgos Ave, Cavite City, Cavite',
          people: [
            { first_name: 'Frank', last_name: 'Romero', role: 'Fire Marshal', contact: '0918-444-5566', notes: 'Cavite Central BFP' },
            { first_name: 'Sarah', last_name: 'De Guzman', role: 'Safety Inspector', contact: '046-431-0123', notes: 'Fire safety clearance' }
          ]
        },
        {
          name: 'State University — Cavite State University (Indang)',
          place_type: 'STATE_UNIVERSITY',
          description: 'Main campus of Cavite State University',
          lat: 14.1994,
          lng: 120.8765,
          address: 'Indang, Cavite',
          people: [
            { first_name: 'Hernando', last_name: 'Robles', role: 'University President', contact: '0915-444-9988', notes: 'President\'s Office' },
            { first_name: 'Maria', last_name: 'Santos', role: 'Dean of Engineering', contact: '046-415-0012', notes: 'Department of Civil Engineering' }
          ]
        },
        {
          name: 'State University — Southern Luzon State University',
          place_type: 'STATE_UNIVERSITY',
          description: 'SLSU Main Campus Lucban',
          lat: 14.1207,
          lng: 121.5583,
          address: 'Brgy. Tinamnan, Lucban, Quezon',
          people: [
            { first_name: 'Doracie', last_name: 'Zoleta-Nantes', role: 'University President', contact: '0918-333-2211', notes: 'Main Campus Administration' },
            { first_name: 'Juanito', last_name: 'Ramos', role: 'Registrar', contact: '042-540-4740', notes: 'Office of the University Registrar' }
          ]
        },
        {
          name: 'State University — Batangas State University (Alangilan)',
          place_type: 'STATE_UNIVERSITY',
          description: 'The National Engineering University - Alangilan Campus',
          lat: 13.7744,
          lng: 121.0772,
          address: 'Alangilan, Batangas City, Batangas',
          people: [
            { first_name: 'Tirso', last_name: 'Ronquillo', role: 'University President', contact: '0917-777-8899', notes: 'Central Administration' },
            { first_name: 'Lilibeth', last_name: 'Alano', role: 'Dean of Computing', contact: '043-980-0385', notes: 'College of Informatics' }
          ]
        },
        {
          name: 'PCG Station — Lemery',
          place_type: 'PCG_STATION',
          description: 'Coast Guard Sub-Station Lemery',
          lat: 13.8741,
          lng: 120.9164,
          address: 'Lemery, Batangas',
          people: [
            { first_name: 'Jose', last_name: 'Beltran', role: 'Station Commander', contact: '0917-222-9900', notes: 'Coast Guard Sub-Station Lemery' },
            { first_name: 'Sarah', last_name: 'Concepcion', role: 'Operations Officer', contact: '0919-888-1122', notes: 'Search and Rescue Ops' }
          ]
        }
      ];

      const checkLocation = db.prepare('SELECT id FROM locations WHERE name = ?');
      const insertLocation = db.prepare(`
        INSERT INTO locations (name, place_type, description, lat, lng, address)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      const checkPerson = db.prepare('SELECT id FROM people WHERE location_id = ? AND first_name = ? AND last_name = ?');
      const insertPerson = db.prepare(`
        INSERT INTO people (location_id, first_name, last_name, role, contact, notes)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const loc of seedLocations) {
        const existingLoc = checkLocation.get(loc.name) as { id: number } | undefined;
        let locId: number;
        
        if (!existingLoc) {
          const result = insertLocation.run(
            loc.name,
            loc.place_type,
            loc.description,
            loc.lat,
            loc.lng,
            loc.address
          ) as { lastInsertRowid: any };
          locId = Number(result.lastInsertRowid);
          console.log(`Seeded location: ${loc.name}`);
        } else {
          locId = existingLoc.id;
        }
        
        for (const person of loc.people) {
          const existingPerson = checkPerson.get(locId, person.first_name, person.last_name) as { id: number } | undefined;
          if (!existingPerson) {
            insertPerson.run(
              locId,
              person.first_name,
              person.last_name,
              person.role,
              person.contact,
              person.notes
            );
            console.log(`Seeded person: ${person.first_name} ${person.last_name} at ${loc.name}`);
          }
        }
      }
      console.log('Database seeding checks completed successfully.');
    } catch (err) {
      console.error('Database seeding failed:', err);
    }
  }
  return db;
}

export default getDb;
