const { createClient } = require('@supabase/supabase-js');
const xlsx = require('xlsx');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function migrateData() {
  console.log('Starting migration...');
  
  const excelPath = path.join(__dirname, '..', 'Church Membership details.xlsx');
  const workbook = xlsx.readFile(excelPath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Convert sheet to array of arrays
  const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
  
  // The first 4 rows are headers (index 0, 1, 2, 3)
  // Data starts at index 4
  let currentFamilyId = null;
  let familyCount = 0;
  let memberCount = 0;

  for (let i = 4; i < rawData.length; i++) {
    const row = rawData[i];
    
    // If row is entirely empty, skip
    if (!row || row.length === 0) continue;

    const sNo = row[0];
    const membershipId = row[1];
    const joinDate = row[2];
    const headName = row[3];
    
    const memberName = row[4];
    const relationship = row[5];
    const gender = row[6];
    const birthDate = row[7];
    const baptismDate = row[8];
    const marriageDate = row[9];
    
    const address = row[10];
    const place = row[11];
    const mobile = row[12];
    const email = row[13];

    // If there is a membership ID, it's a new family
    if (membershipId) {
      console.log(`Processing Family: ${membershipId} - ${headName}`);
      
      const { data: familyData, error: familyError } = await supabase
        .from('families')
        .insert({
          membership_id: String(membershipId),
          join_date: joinDate ? String(joinDate) : null,
          head_name: headName ? String(headName) : null,
          address: address ? String(address) : null,
          place: place ? String(place) : null,
          mobile: mobile ? String(mobile) : null,
          email: email ? String(email) : null,
        })
        .select()
        .single();

      if (familyError) {
        console.error('Error inserting family:', familyError);
        continue;
      }

      currentFamilyId = familyData.id;
      familyCount++;
      
      // Also add the family head as a member if their name exists in member column
      if (memberName) {
        const { error: memberError } = await supabase
          .from('members')
          .insert({
            family_id: currentFamilyId,
            name: String(memberName),
            relationship: relationship ? String(relationship) : 'Head',
            gender: gender ? String(gender) : null,
            birth_date: birthDate ? String(birthDate) : null,
            baptism_date: baptismDate ? String(baptismDate) : null,
            marriage_date: marriageDate ? String(marriageDate) : null,
          });
          
        if (memberError) console.error('Error inserting head as member:', memberError);
        else memberCount++;
      }
    } 
    // If no membership ID but we have a member name, it's a dependent of the current family
    else if (memberName && currentFamilyId) {
      console.log(`  Adding Member: ${memberName} (${relationship})`);
      
      const { error: memberError } = await supabase
        .from('members')
        .insert({
          family_id: currentFamilyId,
          name: String(memberName),
          relationship: relationship ? String(relationship) : null,
          gender: gender ? String(gender) : null,
          birth_date: birthDate ? String(birthDate) : null,
          baptism_date: baptismDate ? String(baptismDate) : null,
          marriage_date: marriageDate ? String(marriageDate) : null,
        });
        
      if (memberError) console.error('Error inserting member:', memberError);
      else memberCount++;
    }
  }

  console.log('-----------------------------------');
  console.log('MIGRATION COMPLETE!');
  console.log(`Successfully imported ${familyCount} families and ${memberCount} total members.`);
  console.log('-----------------------------------');
}

migrateData().catch(console.error);
