import { encryptText } from '../src/lib/encryption.js';
import fs from 'fs';
import path from 'path';

// Manual env parsing since dotenv is not installed
let secret = 'hmis-secure-key-32-character-length-!!!';
try {
    const envContent = fs.readFileSync(path.join(process.cwd(), '.env'), 'utf8');
    const match = envContent.match(/VITE_ENCRYPTION_KEY=(.*)/);
    if (match) secret = match[1].trim();
} catch (e) {
    console.log('Using default secret key');
}

const clients = [
    { first_name: 'Amit', last_name: 'Sharma', dob: '1985-05-15', sex: 'Male', category: 'General', ex_serviceman: false },
    { first_name: 'Priya', last_name: 'Verma', dob: '1992-08-22', sex: 'Female', category: 'OBC', ex_serviceman: false },
    { first_name: 'Rajesh', last_name: 'Kumar', dob: '1978-12-10', sex: 'Male', category: 'SC', ex_serviceman: true },
    { first_name: 'Sangeeta', last_name: 'Patil', dob: '1988-03-30', sex: 'Female', category: 'General', ex_serviceman: false },
    { first_name: 'Vikram', last_name: 'Singh', dob: '1995-07-14', sex: 'Male', category: 'General', ex_serviceman: false },
    { first_name: 'Anjali', last_name: 'Gupta', dob: '1990-11-05', sex: 'Female', category: 'OBC', ex_serviceman: false, privacy_flag: true },
    { first_name: 'Suresh', last_name: 'Rao', dob: '1965-02-28', sex: 'Male', category: 'General', ex_serviceman: true },
    { first_name: 'Meena', last_name: 'Kumari', dob: '1982-09-18', sex: 'Female', category: 'ST', ex_serviceman: false },
    { first_name: 'Rahul', last_name: 'Deshmukh', dob: '1998-04-12', sex: 'Male', category: 'General', ex_serviceman: false },
    { first_name: 'Kavita', last_name: 'Reddy', dob: '1987-06-25', sex: 'Female', category: 'General', ex_serviceman: false },
    { first_name: 'Deepak', last_name: 'Nair', dob: '1993-01-08', sex: 'Male', category: 'OBC', ex_serviceman: false },
    { first_name: 'Sunita', last_name: 'Jadhav', dob: '1975-10-21', sex: 'Female', category: 'SC', ex_serviceman: false },
    { first_name: 'Arjun', last_name: 'Mehta', dob: '1980-05-30', sex: 'Male', category: 'General', ex_serviceman: false },
    { first_name: 'Pooja', last_name: 'Chauhan', dob: '1994-12-15', sex: 'Female', category: 'General', ex_serviceman: false },
    { first_name: 'Sanjay', last_name: 'Mishra', dob: '1972-03-05', sex: 'Male', category: 'General', ex_serviceman: false },
    { first_name: 'Lata', last_name: 'Mangesh', dob: '1985-08-11', sex: 'Female', category: 'OBC', ex_serviceman: false },
    { first_name: 'Vivek', last_name: 'Bose', dob: '1991-04-24', sex: 'Male', category: 'General', ex_serviceman: false },
    { first_name: 'Rashmi', last_name: 'Kulkarni', dob: '1989-07-07', sex: 'Female', category: 'General', ex_serviceman: false },
    { first_name: 'Manoj', last_name: 'Tiwari', dob: '1983-11-30', sex: 'Male', category: 'SC', ex_serviceman: false },
    { first_name: 'Sneha', last_name: 'Iyer', dob: '1996-02-14', sex: 'Female', category: 'General', ex_serviceman: false }
];

async function generate() {
    let sql = '-- SQL Script to seed 20 sample Indian clients for HMIS\n';
    sql += '-- Aadhaar numbers are encrypted using the project secret key\n';
    sql += '-- Run this in your Supabase SQL Editor\n\n';
    sql += 'INSERT INTO clients (first_name, last_name, dob, sex, category, ex_serviceman, privacy_flag, aadhaar_encrypted)\nVALUES \n';

    const baseAadhaar = 555544440000;

    const rows = [];
    for (let i = 0; i < clients.length; i++) {
        const c = clients[i];
        const aadhaar = (baseAadhaar + i).toString();
        const encrypted = await encryptText(aadhaar, secret);

        rows.push(`  ('${c.first_name}', '${c.last_name}', '${c.dob}', '${c.sex}', '${c.category}', ${c.ex_serviceman}, ${c.privacy_flag || false}, '${encrypted}')`);
    }

    sql += rows.join(',\n') + '\nON CONFLICT (first_name, last_name, dob) DO UPDATE SET\n  aadhaar_encrypted = EXCLUDED.aadhaar_encrypted,\n  updated_at = NOW();';

    fs.writeFileSync(path.join(process.cwd(), 'scripts', 'seedClients.sql'), sql);
    console.log('Successfully generated scripts/seedClients.sql with encrypted Aadhaar numbers');
}

generate().catch(console.error);
