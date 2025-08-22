"use strict";
const express = require("express");
const router = express.Router();
const controller = require("../app/controllers/PropertyController")
const { authenticateUser, authorizeRoles } = require("../lib/authMiddleware")
const upload = require("../app/utils/upload")

/**
 * @swagger
 * tags:
 *   name: Properties
 *   description: Property management endpoints
 */

/**
 * @swagger
 * /api/v1/properties/create:
 *   post:
 *     summary: Create a new property
 *     tags: [Properties]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - price
 *               - location
 *               - propertyType
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               location:
 *                 type: string
 *               propertyType:
 *                 type: string
 *                 enum: [apartment, house, villa, commercial, land]
 *               bedrooms:
 *                 type: number
 *               bathrooms:
 *                 type: number
 *               squareFootage:
 *                 type: number
 *               mediaType:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Property created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Property'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post("/create/:userId",
    authenticateUser,
    authorizeRoles("ADMIN","REALTOR", "DEVELOPER", "HOMEOWNER", "SYSADMIN")
    , upload.array("cloudinaryUrls",5), controller.createProperty);

/**
 * @swagger
 * /api/v1/properties/{propertyId}:
 *   get:
 *     summary: Get property by ID
 *     tags: [Properties]
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *         description: Property ID
 *     responses:
 *       200:
 *         description: Property retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Property'
 *       404:
 *         description: Property not found
 */
router.get("/:propertyId", controller.getProperty);

/**
 * @swagger
 * /api/v1/properties:
 *   get:
 *     summary: Get all properties
 *     tags: [Properties]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: propertyType
 *         schema:
 *           type: string
 *         description: Filter by property type
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum price filter
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price filter
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Location filter
 *     responses:
 *       200:
 *         description: Properties retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Property'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     pages:
 *                       type: integer
 */
router.get("/", controller.getAllProperties);

/**
 * @swagger
 * /api/v1/properties/owner/{ownerId}:
 *   get:
 *     summary: Get properties by owner
 *     tags: [Properties]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ownerId
 *         required: true
 *         schema:
 *           type: string
 *         description: Owner ID
 *     responses:
 *       200:
 *         description: Properties retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Property'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get("/owner/:ownerId",
    authenticateUser,
    authorizeRoles("OWNER", "ADMIN", "SYSADMIN"), controller.getPropertiesByOwner);

/**
 * @swagger
 * /api/v1/properties/{propertyId}:
 *   put:
 *     summary: Update property
 *     tags: [Properties]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *         description: Property ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               price:
 *                 type: number
 *               location:
 *                 type: string
 *               propertyType:
 *                 type: string
 *               bedrooms:
 *                 type: number
 *               bathrooms:
 *                 type: number
 *               squareFootage:
 *                 type: number
 *               mediaType:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       200:
 *         description: Property updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Property'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Property not found
 */
router.put("/:propertyId",
    authenticateUser,
    authorizeRoles("ADMIN", "OWNER", "SYSADMIN")
    , upload.array("mediaType"), controller.updateProperty);

/**
 * @swagger
 * /api/v1/properties/{propertyId}:
 *   delete:
 *     summary: Delete property
 *     tags: [Properties]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *         description: Property ID
 *     responses:
 *       200:
 *         description: Property deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Property not found
 */
router.delete("/:propertyId",
    authenticateUser,
    authorizeRoles("ADMIN", "OWNER", "SYSADMIN"), controller.deleteProperty);

/**
 * @swagger
 * /api/v1/properties/search:
 *   get:
 *     summary: Search properties
 *     tags: [Properties]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: propertyType
 *         schema:
 *           type: string
 *         description: Property type filter
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Minimum price
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Maximum price
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Location filter
 *       - in: query
 *         name: bedrooms
 *         schema:
 *           type: number
 *         description: Number of bedrooms
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Property'
 */
router.get("/search", controller.searchProperties);

/**
 * @swagger
 * /api/v1/properties/properties/analytics:
 *   get:
 *     summary: Get property analytics
 *     tags: [Properties]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Analytics retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalProperties:
 *                       type: number
 *                     propertiesByType:
 *                       type: object
 *                     averagePrice:
 *                       type: number
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get("/properties/analytics",
    authenticateUser,
    authorizeRoles("ADMIN", "OWNER", "SYSADMIN"), controller.getPropertyStats);

/**
 * @swagger
 * /api/v1/properties/user/{userId}:
 *   get:
 *     summary: Get properties by user ID
 *     tags: [Properties]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID
 *     responses:
 *       200:
 *         description: Properties retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Property'
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
router.get("/user/:userId",
    authenticateUser,
    authorizeRoles("ADMIN", "OWNER", "SYSADMIN"), controller.getPropertiesByUser);

/**
 * @swagger
 * /api/v1/properties/{propertyId}/status:
 *   put:
 *     summary: Update property status
 *     tags: [Properties]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: propertyId
 *         required: true
 *         schema:
 *           type: string
 *         description: Property ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [active, pending, draft, sold, unavailable]
 *                 description: New property status
 *     responses:
 *       200:
 *         description: Property status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/Property'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Property not found
 */
router.put("/:propertyId/status",
    authenticateUser,
    authorizeRoles("ADMIN", "HOMEOWNER", "SYSADMIN"), controller.updatePropertyStatus);

router.post("/listing/:propertyId/:userId", 
    authenticateUser,
    authorizeRoles(["HOMEOWNER", "ADMIN", "SYSADMIN"]),
    controller.createListing)


router.get("/role/listings", controller.getListingsByRole)

module.exports = router;