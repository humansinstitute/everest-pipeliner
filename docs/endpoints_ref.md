# Everest API v2 - Endpoints Reference

This document provides comprehensive documentation for the MongoDB and Agent endpoints in the Everest API v2, including sample request and response objects for client implementation.

## Table of Contents

1. [Authentication](#authentication)
2. [MongoDB Endpoints](#mongodb-endpoints)
3. [Agent Endpoints](#agent-endpoints)
4. [Dialogue Endpoints](#dialogue-endpoints)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)

## Authentication

All endpoints require API key authentication via the `Authorization` header:

```
Authorization: Bearer YOUR_API_KEY
```

## MongoDB Endpoints

### Base URL

```
POST /api/v2/mongo
```

The MongoDB endpoint provides CRUD operations for all registered models with comprehensive validation and error handling.

### Supported Models

- **User**: User authentication and profile management
- **Content**: Content management for articles, posts, and media
- **Billing**: AI API usage billing and cost tracking

### Request Structure

```json
{
  "operation": "create|read|update|delete",
  "model": "User|Content|Billing",
  "collection": "optional_collection_name",
  "data": {},
  "query": {},
  "options": {}
}
```

### Response Structure

```json
{
  "success": true|false,
  "data": {},
  "metadata": {
    "operation": "string",
    "model": "string",
    "collection": "string",
    "executionTime": "string",
    "timestamp": "string",
    "requestId": "string"
  },
  "error": "string (if success: false)",
  "code": "string (if success: false)"
}
```

---

## MongoDB Operations

### 1. CREATE Operation

Creates a new document in the specified model.

#### Request Example - Create User

```json
{
  "operation": "create",
  "model": "User",
  "data": {
    "username": "johndoe",
    "email": "john.doe@example.com",
    "passwordHash": "$2b$10$hashedpassword",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user",
    "isActive": true,
    "profile": {
      "bio": "Software developer passionate about AI",
      "avatar": "https://example.com/avatar.jpg",
      "location": "San Francisco, CA"
    },
    "preferences": {
      "theme": "dark",
      "notifications": {
        "email": true,
        "push": false
      }
    },
    "socialLinks": {
      "twitter": "https://twitter.com/johndoe",
      "linkedin": "https://linkedin.com/in/johndoe"
    }
  }
}
```

#### Response Example - Create User Success

```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "username": "johndoe",
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user",
    "isActive": true,
    "profile": {
      "bio": "Software developer passionate about AI",
      "avatar": "https://example.com/avatar.jpg",
      "location": "San Francisco, CA"
    },
    "preferences": {
      "theme": "dark",
      "notifications": {
        "email": true,
        "push": false
      }
    },
    "socialLinks": {
      "twitter": "https://twitter.com/johndoe",
      "linkedin": "https://linkedin.com/in/johndoe"
    },
    "analytics": {
      "loginCount": 0,
      "lastActiveAt": null,
      "registrationIP": "192.168.1.1"
    },
    "permissions": [],
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "metadata": {
    "operation": "create",
    "model": "User",
    "collection": "User",
    "executionTime": "45ms",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "requestId": "req_123456789"
  }
}
```

#### Request Example - Create Content

```json
{
  "operation": "create",
  "model": "Content",
  "data": {
    "title": "Getting Started with AI Development",
    "slug": "getting-started-ai-development",
    "body": "This comprehensive guide covers the fundamentals of AI development...",
    "excerpt": "Learn the basics of AI development in this beginner-friendly guide.",
    "type": "article",
    "status": "draft",
    "author": "507f1f77bcf86cd799439011",
    "tags": ["AI", "Machine Learning", "Development", "Tutorial"],
    "categories": ["Technology", "Education"],
    "seo": {
      "metaTitle": "Getting Started with AI Development - Complete Guide",
      "metaDescription": "Learn AI development fundamentals with our comprehensive guide.",
      "keywords": ["AI development", "machine learning", "tutorial"]
    },
    "settings": {
      "allowComments": true,
      "isFeatured": false,
      "isPublic": true
    }
  }
}
```

#### Response Example - Create Content Success

```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439012",
    "title": "Getting Started with AI Development",
    "slug": "getting-started-ai-development",
    "body": "This comprehensive guide covers the fundamentals of AI development...",
    "excerpt": "Learn the basics of AI development in this beginner-friendly guide.",
    "type": "article",
    "status": "draft",
    "author": "507f1f77bcf86cd799439011",
    "tags": ["AI", "Machine Learning", "Development", "Tutorial"],
    "categories": ["Technology", "Education"],
    "seo": {
      "metaTitle": "Getting Started with AI Development - Complete Guide",
      "metaDescription": "Learn AI development fundamentals with our comprehensive guide.",
      "keywords": ["AI development", "machine learning", "tutorial"]
    },
    "settings": {
      "allowComments": true,
      "isFeatured": false,
      "isPublic": true
    },
    "analytics": {
      "views": 0,
      "likes": 0,
      "shares": 0,
      "comments": 0
    },
    "workflow": {
      "currentStep": "draft",
      "history": []
    },
    "createdAt": "2024-01-15T10:35:00.000Z",
    "updatedAt": "2024-01-15T10:35:00.000Z"
  },
  "metadata": {
    "operation": "create",
    "model": "Content",
    "collection": "Content",
    "executionTime": "52ms",
    "timestamp": "2024-01-15T10:35:00.000Z",
    "requestId": "req_123456790"
  }
}
```

### 2. READ Operation

Retrieves documents based on query criteria.

#### Request Example - Read Users

```json
{
  "operation": "read",
  "model": "User",
  "query": {
    "isActive": true,
    "role": "user"
  },
  "options": {
    "limit": 10,
    "sort": { "createdAt": -1 },
    "select": "username email firstName lastName profile.avatar createdAt"
  }
}
```

#### Response Example - Read Users Success

```json
{
  "success": true,
  "data": [
    {
      "_id": "507f1f77bcf86cd799439011",
      "username": "johndoe",
      "email": "john.doe@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "profile": {
        "avatar": "https://example.com/avatar.jpg"
      },
      "createdAt": "2024-01-15T10:30:00.000Z"
    },
    {
      "_id": "507f1f77bcf86cd799439013",
      "username": "janedoe",
      "email": "jane.doe@example.com",
      "firstName": "Jane",
      "lastName": "Doe",
      "profile": {
        "avatar": "https://example.com/avatar2.jpg"
      },
      "createdAt": "2024-01-14T15:20:00.000Z"
    }
  ],
  "metadata": {
    "operation": "read",
    "model": "User",
    "collection": "User",
    "executionTime": "23ms",
    "timestamp": "2024-01-15T10:40:00.000Z",
    "requestId": "req_123456791",
    "count": 2,
    "totalCount": 2
  }
}
```

#### Request Example - Read Content with Population

```json
{
  "operation": "read",
  "model": "Content",
  "query": {
    "status": "published",
    "type": "article"
  },
  "options": {
    "limit": 5,
    "sort": { "publishedAt": -1 },
    "populate": ["author"],
    "select": "title slug excerpt author publishedAt analytics.views"
  }
}
```

### 3. UPDATE Operation

Updates existing documents based on query criteria.

#### Request Example - Update User

```json
{
  "operation": "update",
  "model": "User",
  "query": {
    "_id": "507f1f77bcf86cd799439011"
  },
  "data": {
    "profile.bio": "Senior Software Developer specializing in AI and Machine Learning",
    "preferences.theme": "light",
    "analytics.lastActiveAt": "2024-01-15T10:45:00.000Z"
  },
  "options": {
    "returnDocument": "after"
  }
}
```

#### Response Example - Update User Success

```json
{
  "success": true,
  "data": {
    "_id": "507f1f77bcf86cd799439011",
    "username": "johndoe",
    "email": "john.doe@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "user",
    "isActive": true,
    "profile": {
      "bio": "Senior Software Developer specializing in AI and Machine Learning",
      "avatar": "https://example.com/avatar.jpg",
      "location": "San Francisco, CA"
    },
    "preferences": {
      "theme": "light",
      "notifications": {
        "email": true,
        "push": false
      }
    },
    "analytics": {
      "loginCount": 5,
      "lastActiveAt": "2024-01-15T10:45:00.000Z",
      "registrationIP": "192.168.1.1"
    },
    "updatedAt": "2024-01-15T10:45:00.000Z"
  },
  "metadata": {
    "operation": "update",
    "model": "User",
    "collection": "User",
    "executionTime": "31ms",
    "timestamp": "2024-01-15T10:45:00.000Z",
    "requestId": "req_123456792",
    "modifiedCount": 1
  }
}
```

### 4. DELETE Operation

Deletes documents based on query criteria.

#### Request Example - Delete Content

```json
{
  "operation": "delete",
  "model": "Content",
  "query": {
    "_id": "507f1f77bcf86cd799439012",
    "author": "507f1f77bcf86cd799439011"
  }
}
```

#### Response Example - Delete Content Success

```json
{
  "success": true,
  "data": {
    "deletedCount": 1,
    "acknowledged": true
  },
  "metadata": {
    "operation": "delete",
    "model": "Content",
    "collection": "Content",
    "executionTime": "18ms",
    "timestamp": "2024-01-15T10:50:00.000Z",
    "requestId": "req_123456793"
  }
}
```

---

## Agent Endpoints

### Base URL

```
POST /api/v2/agent
```

The Agent endpoint provides dynamic AI agent execution with flexible model and chat configuration.

### Request Structure

```json
{
  "callID": "optional_call_id",
  "model": {
    "provider": "string",
    "model": "string",
    "type": "string",
    "temperature": number,
    "callType": "optional_string"
  },
  "chat": {
    "userPrompt": "string",
    "systemPrompt": "string",
    "messageContext": "optional_string",
    "messageHistory": []
  },
  "origin": {
    "originID": "string",
    "conversationID": "string",
    "channel": "string",
    "channelSpace": "string",
    "userID": "string",
    "billingID": "string",
    "callTS": "ISO8601_string",
    "pipeID": "optional_string",
    "response": "optional_string",
    "webhook_url": "optional_string"
  }
}
```

### Request Example - OpenAI GPT-4 Agent

```json
{
  "callID": "call_123456789",
  "model": {
    "provider": "openai",
    "model": "gpt-4",
    "type": "chat",
    "temperature": 0.7,
    "callType": "Content Generation"
  },
  "chat": {
    "userPrompt": "Write a comprehensive blog post about the benefits of renewable energy sources. Include statistics and real-world examples.",
    "systemPrompt": "You are an expert environmental writer with deep knowledge of renewable energy technologies. Write engaging, informative content that is accessible to a general audience while maintaining scientific accuracy.",
    "messageContext": "This is for a sustainability blog targeting environmentally conscious consumers.",
    "messageHistory": [
      {
        "role": "user",
        "content": "What topics should I cover in renewable energy content?"
      },
      {
        "role": "assistant",
        "content": "For renewable energy content, consider covering solar, wind, hydroelectric, geothermal, and biomass energy sources, along with their environmental and economic benefits."
      }
    ]
  },
  "origin": {
    "originID": "blog_platform_001",
    "conversationID": "conv_renewable_energy_2024",
    "channel": "content_generation",
    "channelSpace": "sustainability_blog",
    "userID": "user_content_creator_123",
    "billingID": "billing_account_456",
    "callTS": "2024-01-15T11:00:00.000Z",
    "pipeID": "content_pipeline_001"
  }
}
```

### Response Example - Agent Success

```json
{
  "callID": "call_123456789",
  "success": true,
  "response": {
    "content": "# The Power of Renewable Energy: Building a Sustainable Future\n\nRenewable energy sources have emerged as the cornerstone of our transition to a sustainable future. As climate change concerns intensify and fossil fuel reserves dwindle, the adoption of clean energy technologies has accelerated dramatically...\n\n## Solar Energy: Harnessing the Sun's Power\n\nSolar energy has experienced unprecedented growth, with global solar capacity reaching 1,177 GW by the end of 2022, according to the International Renewable Energy Agency (IRENA)...",
    "usage": {
      "prompt_tokens": 245,
      "completion_tokens": 1250,
      "total_tokens": 1495
    },
    "model": "gpt-4",
    "finish_reason": "stop"
  },
  "metadata": {
    "provider": "openai",
    "model": "gpt-4",
    "type": "chat",
    "temperature": 0.7,
    "callType": "Content Generation",
    "executionTime": "3.2s",
    "timestamp": "2024-01-15T11:00:03.200Z"
  },
  "origin": {
    "originID": "blog_platform_001",
    "conversationID": "conv_renewable_energy_2024",
    "channel": "content_generation",
    "channelSpace": "sustainability_blog",
    "userID": "user_content_creator_123",
    "billingID": "billing_account_456",
    "callTS": "2024-01-15T11:00:00.000Z",
    "pipeID": "content_pipeline_001",
    "processedAt": "2024-01-15T11:00:03.200Z"
  },
  "billing": {
    "cost": 0.045,
    "currency": "USD",
    "tokens": 1495
  }
}
```

### Request Example - Anthropic Claude Agent

```json
{
  "model": {
    "provider": "anthropic",
    "model": "claude-3-sonnet-20240229",
    "type": "chat",
    "temperature": 0.3
  },
  "chat": {
    "userPrompt": "Analyze the following customer feedback and provide actionable insights: 'The product is great but the delivery was slow and customer service was unresponsive.'",
    "systemPrompt": "You are a customer experience analyst. Provide structured analysis of customer feedback with specific recommendations for improvement."
  },
  "origin": {
    "originID": "crm_system_001",
    "conversationID": "feedback_analysis_session",
    "channel": "customer_insights",
    "channelSpace": "support_analytics",
    "userID": "analyst_user_789",
    "billingID": "enterprise_billing_123",
    "callTS": "2024-01-15T11:15:00.000Z"
  }
}
```

### Request Example - Local Model Agent

```json
{
  "model": {
    "provider": "local",
    "model": "llama2-7b",
    "type": "chat",
    "temperature": 0.5
  },
  "chat": {
    "userPrompt": "Explain quantum computing in simple terms for a high school student.",
    "systemPrompt": "You are an educational assistant. Explain complex topics in an accessible way using analogies and simple language."
  },
  "origin": {
    "originID": "education_platform_001",
    "conversationID": "quantum_computing_lesson",
    "channel": "educational_content",
    "channelSpace": "physics_tutoring",
    "userID": "student_user_456",
    "billingID": "education_billing_789",
    "callTS": "2024-01-15T11:30:00.000Z"
  }
}
```

## Best Practices

### 1. MongoDB Operations

- Always include proper error handling for all response codes
- Use appropriate query options (limit, sort) to optimize performance
- Validate data on the client side before sending requests
- Use specific queries to avoid retrieving unnecessary data
- Implement pagination for large datasets using `skip` and `limit`

### 2. Agent Operations

- Set appropriate temperature values based on use case (0.1-0.3 for factual, 0.7-0.9 for creative)
- Include relevant message history for context-aware conversations
- Use specific system prompts to guide AI behavior
- Monitor token usage for cost optimization
- Implement proper timeout handling for long-running requests

### 3. General

- Always include proper authentication headers
- Implement exponential backoff for retry logic
- Log request IDs for debugging and support
- Validate responses before processing data
- Handle network timeouts gracefully
