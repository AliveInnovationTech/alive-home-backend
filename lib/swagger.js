const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Alive Home Backend API',
      version: '1.0.0',
      description: 'A comprehensive real estate platform API for buyers, sellers, developers, and realtors',
      contact: {
        name: 'API Support',
        email: 'preciousagamuyi@gmail.com'
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT'
      }
    },
    servers: [
      {
        url: 'http://localhost:9000',
        description: 'Development server'
      },
      {
        url: 'https://api.alivehome.com',
        description: 'Production server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            email: { type: 'string', format: 'email' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            phoneNumber: { type: 'string' },
            role: { type: 'string', enum: ['buyer', 'seller', 'developer', 'realtor', 'admin'] },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Property: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            title: { type: 'string' },
            description: { type: 'string' },
            price: { type: 'number' },
            location: { type: 'string' },
            propertyType: { type: 'string' },
            bedrooms: { type: 'number' },
            bathrooms: { type: 'number' },
            squareFootage: { type: 'number' },
            status: { type: 'string', enum: ['available', 'sold', 'pending'] },
            owner: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Appointment: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            propertyId: { type: 'string' },
            buyerId: { type: 'string' },
            realtorId: { type: 'string' },
            scheduledDate: { type: 'string', format: 'date-time' },
            status: { type: 'string', enum: ['pending', 'confirmed', 'cancelled', 'completed'] },
            notes: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Payment: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            amount: { type: 'number' },
            currency: { type: 'string', default: 'NGN' },
            paymentMethod: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'completed', 'failed', 'refunded'] },
            transactionId: { type: 'string' },
            userId: { type: 'string' },
            propertyId: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
            statusCode: { type: 'number' }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: [
    './routes/*.js',
    './app/controllers/*.js',
    './app/models/*.js'
  ]
};

const specs = swaggerJsdoc(options);

module.exports = specs;
