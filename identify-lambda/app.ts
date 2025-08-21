import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { supabase } from './supabase/db-client';
import { Contact } from './types';

export const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const { email, phoneNumber } = JSON.parse(event.body || '{}');

    if (!email && !phoneNumber) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Provide email or phoneNumber' }),
      };
    }
    // Get all contacts that match OR are linked to matching contacts
    let allContacts: Contact[] = [];

    if (email || phoneNumber) {
        // First, get direct matches
        let directMatches: Contact[] = [];
        
        if (email) {
            const { data: emailMatches, error: emailError } = await supabase()
                .from('contact')
                .select('*')
                .eq('email', email)
                .is('deleted_at', null);
            
            if (!emailError && emailMatches) {
                directMatches.push(...emailMatches);
            }
        }
        
        if (phoneNumber) {
            const { data: phoneMatches, error: phoneError } = await supabase()
                .from('contact')
                .select('*')
                .eq('phonenumber', phoneNumber)
                .is('deleted_at', null);
            
            if (!phoneError && phoneMatches) {
                directMatches.push(...phoneMatches);
            }
        }
        
        // Now expand to get all linked contacts
        const allIds = new Set<number>();
        
        for (const contact of directMatches) {
            allIds.add(contact.id);
            
            if (contact.linked_id) {
                allIds.add(contact.linked_id); // Add primary
            } else if (contact.link_precedence === 'primary') {
                // Add all secondaries
                const { data: secondaries, error: secondaryError } = await supabase()
                    .from('contact')
                    .select('id')
                    .eq('linked_id', contact.id)
                    .is('deleted_at', null);
                
                if (!secondaryError && secondaries) {
                    secondaries.forEach(s => allIds.add(s.id));
                }
            }
        }
        
        // Fetch all contacts in the hierarchy
        const { data: allContactsData, error: allError } = await supabase()
            .from('contact')
            .select('*')
            .in('id', Array.from(allIds))
            .order('created_at', { ascending: true });
        
        if (!allError && allContactsData) {
            allContacts = allContactsData;
        }
    }
    if (allContacts.length === 0) {
        // create new primary contact
        const { data: newContact, error } = await supabase()
            .from('contact')
            .insert({
                email,
                phonenumber: phoneNumber,
                linked_id: null,
                link_precedence: 'primary'
            })
            .select('*');
        if (error) {
            return {
                statusCode: 500,
                body: JSON.stringify({ error }),
            };
        }
        return {
            statusCode: 200,
            body: JSON.stringify({
                "contact": {
                    "primaryContactId": newContact![0].id,
                    "emails": email ? [email] : [], // first element being email of primary contact
                    "phoneNumbers": phoneNumber ? [phoneNumber] : [], // first element being phone number of primary contact
                    "secondaryContactIds": [] // Array of all Contact IDs that are "secondary" to the primary contact
                }
            }),
        }
    } else {
        // Identify primary contact
        const primaryContact = allContacts.find(c => c.link_precedence === "primary");
        const primaryContactId = primaryContact ? primaryContact.id : null;

        const emailExists = allContacts.some(contact => contact.email === email);
        const phoneExists = allContacts.some(contact => contact.phonenumber === phoneNumber);

        // Create new secondary contact if we have new info 
        const hasNewEmail = email && !emailExists;
        const hasNewPhone = phoneNumber && !phoneExists;

        if ((hasNewEmail || hasNewPhone) && (email || phoneNumber)) {
            // create new secondary contact
            const { data: newContact, error } = await supabase()
                .from('contact')
                .insert({
                    email,
                    phonenumber: phoneNumber,
                    linked_id: primaryContactId,
                    link_precedence: 'secondary',
                    updated_at: new Date().toISOString(),
                })
                .select('*');
            if (error) {
                return {
                    statusCode: 500,
                    body: JSON.stringify({ error: 'Database error' }),
                };
            }
            allContacts.push(newContact![0]);
        }

        const contactsToMerge = allContacts.filter(contact => 
            contact.id !== primaryContact!.id &&           
            contact.link_precedence === 'primary'       
        );

        // Check after updating if there are any contacts to merge
        for (const contactToMerge of contactsToMerge) {
            const { error: updateError } = await supabase()
                .from('contact')
                .update({ 
                    linked_id: primaryContact!.id,
                    link_precedence: 'secondary'
                })
                .eq('id', contactToMerge.id);
            if (updateError) {
                console.error('Error updating contact to secondary:', updateError);
                return {
                    statusCode: 500,
                    body: JSON.stringify({ error: 'Database error' }),
                };
            }
        }

        const { data: finalContacts, error: finalContactsError } = await supabase()
            .from('contact')
            .select('*')
            .or(`id.eq.${primaryContact!.id},linked_id.eq.${primaryContact!.id}`)
            .order('created_at', { ascending: true });

        if (finalContactsError) {
            console.error('Error fetching final contacts:', finalContactsError);
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Database error' }),
            };
        }
        
        const primaryContactFinal = finalContacts.find(c => c.id === primaryContact!.id);
        const secondaryContacts = finalContacts.filter(c => c.id !== primaryContact!.id);

        // Collect all emails and phone numbers
        const allEmails = finalContacts
            .filter(c => c.email)
            .map(c => c.email!)
            .sort((a, b) => {
                // Primary contact's email first, then by creation date
                if (a === primaryContactFinal?.email) return -1;
                if (b === primaryContactFinal?.email) return 1;
                return 0;
            })

        const allPhoneNumbers = finalContacts
            .filter(c => c.phonenumber)
            .map(c => c.phonenumber!)
            .sort((a, b) => {
                // Primary contact's phone first, then by creation date
                if (a === primaryContactFinal?.phonenumber) return -1;
                if (b === primaryContactFinal?.phonenumber) return 1;
                return 0;
            })

        return {
            statusCode: 200,
            body: JSON.stringify({
                contact: {
                    primaryContactId: primaryContact!.id,
                    emails: allEmails,
                    phoneNumbers: allPhoneNumbers,
                    secondaryContactIds: secondaryContacts.map(c => c.id)
                }
            }),
        };
    }
};
