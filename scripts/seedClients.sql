-- SQL Script to seed 20 sample Indian clients for HMIS
-- Aadhaar numbers are encrypted using the project secret key
-- Run this in your Supabase SQL Editor

INSERT INTO clients (first_name, last_name, dob, sex, category, ex_serviceman, privacy_flag, aadhaar_encrypted)
VALUES 
  ('Amit', 'Sharma', '1985-05-15', 'Male', 'General', false, false, 'a0CNxrre+1Po68LPFMJ3vRBaENq2fXDBRSsuM1iX0mbt4u+NKXdOjQ=='),
  ('Priya', 'Verma', '1992-08-22', 'Female', 'OBC', false, false, 'g95No1E2+rpIsF09Sb0Xo/PXyGZUt7E/Chl+guHMWf2tD1J30t8A1Q=='),
  ('Rajesh', 'Kumar', '1978-12-10', 'Male', 'SC', true, false, 'df9SNSe0wD6o0guUh3wYkIVz0NOnh4yvbkE4u2GZWRifjE/Ywbe1Cg=='),
  ('Sangeeta', 'Patil', '1988-03-30', 'Female', 'General', false, false, 'XqA1v3oynpDih6ULT8cAdHLkADG4sojmOxLFHasCSte8+bpELkX9vQ=='),
  ('Vikram', 'Singh', '1995-07-14', 'Male', 'General', false, false, 'amaWun7pn5KNCJRVRwi0WK/FhAhG+q2kXgZ7BBBMeCn0GKEqUOGYRQ=='),
  ('Anjali', 'Gupta', '1990-11-05', 'Female', 'OBC', false, true, 'G1PatWMBWX3EHLuTi+ciWCnf7J4hx32vHi1pgfOHFSmuRdTCRMZg1g=='),
  ('Suresh', 'Rao', '1965-02-28', 'Male', 'General', true, false, '9oHrjTg3XDn5jXsUigdvDsKuLbf+ZS0KAcPbvMTtZQgbF63hnGb8dw=='),
  ('Meena', 'Kumari', '1982-09-18', 'Female', 'ST', false, false, 'fZ05k7hLN9Fg/E/Y2HiSHlzlSGFl9FYb1u/o60+so8p3hR8fHiOg0Q=='),
  ('Rahul', 'Deshmukh', '1998-04-12', 'Male', 'General', false, false, 'L8XC93JQGBpfYm+uCfK2PEtC1XGpUMAkcjKZuohKfQir6cnTGTYjdQ=='),
  ('Kavita', 'Reddy', '1987-06-25', 'Female', 'General', false, false, 'AaDWKMIXfSTZqRLJstu0yDh4pN+gd0WZSIa7RA2S7nODGebAcIeF8g=='),
  ('Deepak', 'Nair', '1993-01-08', 'Male', 'OBC', false, false, 'Zv1xAPDj3llAva1Wrt4fcVe0DzL8W/o8zOxzRyxHO3inDF/OznJzkQ=='),
  ('Sunita', 'Jadhav', '1975-10-21', 'Female', 'SC', false, false, 'kf1532GJM9DyqauNRGrSk5nGIwin0NsUbuX25jGrTWAsU0TwR+1Wsw=='),
  ('Arjun', 'Mehta', '1980-05-30', 'Male', 'General', false, false, '4nHKe/WpmCrsWBa3iZ4o+oXppNIpyE7wdWv++XN2JqmgONVwNPvg0Q=='),
  ('Pooja', 'Chauhan', '1994-12-15', 'Female', 'General', false, false, 'LPODtRC7K05EBDLrh25HdiyJRbwJn1QtUuG0Jb8rZMAYJ0E/qhoxbA=='),
  ('Sanjay', 'Mishra', '1972-03-05', 'Male', 'General', false, false, 'mOfPl57GUdWr6ZPJty057vAmgt5eL7Hq73DbrKRjZYnEhQZiDK1A2A=='),
  ('Lata', 'Mangesh', '1985-08-11', 'Female', 'OBC', false, false, 'EV7IHPHnOIsxm1XShf9kmL8jLWaaHdqvl22IC5FUS8YNPs+7bzfOAw=='),
  ('Vivek', 'Bose', '1991-04-24', 'Male', 'General', false, false, 'IZxLyjemBLHwjsRKbhq2/YfIhFseglkha2qaupzDNpKQZ+1+ALNDAg=='),
  ('Rashmi', 'Kulkarni', '1989-07-07', 'Female', 'General', false, false, '6kGOxYMtVeB6uYgm+X86PFMSGN4/7YOaBsu76+ikTsH6pus8N/N23w=='),
  ('Manoj', 'Tiwari', '1983-11-30', 'Male', 'SC', false, false, 'NkauULfp8E4jnZnGIVcoCa2Fy4wCEdjS6L/4L+tmSQW44Q9P9+9Mgg=='),
  ('Sneha', 'Iyer', '1996-02-14', 'Female', 'General', false, false, 'MfVPCDuvyMH8rMutrfWVdb+1tz9qGpB/i7dnaBvKAFAlju4XLaFlcg==')
ON CONFLICT (first_name, last_name, dob) DO UPDATE SET
  aadhaar_encrypted = EXCLUDED.aadhaar_encrypted,
  updated_at = NOW();