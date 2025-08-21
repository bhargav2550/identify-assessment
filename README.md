# Identity Reconciliation Service

A simple service that links contacts based on matching email addresses and phone numbers.

## Tech Stack

- **AWS SAM** - Serverless Application Model for deployment
- **Lambda** - Serverless function to handle requests
- **TypeScript** - Type-safe code
- **Supabase (PostgreSQL)** - Database to store contacts
- **API Gateway** - REST API endpoint

## API Endpoint

**URL:** The API endpoint i provided.

**Method:** POST

**Headers:** `Content-Type: application/json`

**Body:** {
  "email": "john@example.com",
  "phoneNumber": "+1234567890"
}


## Testing with Postman
1. Set method to POST
2. Set URL to your API endpoint
3. Set Headers: `Content-Type: application/json`
4. Set Body (raw JSON):
   ```json
   {
     "email": "test@example.com",
     "phoneNumber": "+1234567890"
   }
   ```

## Database Schema

The `contact` table has these fields:
- `id` - Unique identifier
- `email` - Email address (can be null)
- `phonenumber` - Phone number (can be null)
- `linked_id` - Points to primary contact (null for primary contacts)
- `link_precedence` - Either "primary" or "secondary"
- `created_at` - When contact was created
- `updated_at` - When contact was last updated
- `deleted_at` - Soft delete timestamp (null if not deleted)

## Deployment

```bash
# Build and deploy
sam build
sam deploy --guided
```

## Local Development

```bash
# Install dependencies
cd identify-lambda
npm install

# Run tests
npm test

# Local testing with SAM
sam local invoke IdentifyFunction --event events/event.json
```

## Environment Variables

You need to set these in your SAM template:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_KEY` - Your Supabase anonymous key
