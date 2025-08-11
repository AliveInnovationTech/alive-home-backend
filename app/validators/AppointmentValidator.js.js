"use strict";
const { validate } = require("../utils/helpers");
const Joi = require("joi")
const { SERVICE, QUESTION, WEDDING, INVOICE } = require("../utils/constants")


exports.appointment = async (body) => {
     let schema = {
          package: Joi.string().required(),
          description: Joi.string().required(),
          price: Joi.number().required(),
          image: Joi.string().uri(),
          firstName: Joi.string().required(),
          lastName: Joi.string().required(),
          phoneNumber: Joi.string().required(),
          email: Joi.string().email({ minDomainSegments: 2, tlds: { allow: ['com', 'net', 'io', 'org', 'ng', 'edu', 'it', 'co', 'uk'] } }).required(),
          service_date: Joi.string(),
          service_time: Joi.string(),
          preferred_service_location: Joi.string().required(),
          address: Joi.string(),
          service_type: Joi.string().valid(
               SERVICE.TYPE.BRIDE_ONLY,
               SERVICE.TYPE.BRIDE_AND_BRIDAL_PARTIES,
          ).default(SERVICE.TYPE.BRIDE_AND_BRIDAL_PARTIES).required(),
          wedding: Joi.string()
               .valid(
                    WEDDING.TRADITIONAL_RELIGIOUS_WEDDING,
                    WEDDING.FORMAL_WEDDING, WEDDING.INFORMAL_WEDDING,
                    WEDDING.DESTINATION_WEDDING, WEDDING.CRUISE_WEDDING,
                    WEDDING.ELOPEMENT_WEDDING, WEDDING.VINTAGE_STYLE_WEDDING,
                    WEDDING.INDUSTRIAL, WEDDING.CONTEMPORARY_ELEGANCE,
                    WEDDING.ROMANTIC_VINEYARD, WEDDING.COUNTRY_FARM_WEDDING,
                    WEDDING.GROUP_WEDDING, WEDDING.DOUBLE_WEDDING, WEDDING.FESTIVAL,
                    WEDDING.MILITARY_WEDDING, WEDDING.DIY_WEDDING, WEDDING.PROXY_WEDDING
               ).default(WEDDING.TRADITIONAL_RELIGIOUS_WEDDING).required(),
          makeup_flower_girls: Joi.array().items({
               quantity: Joi.number().required(),
               price: Joi.number().required()
          }).required(),
          makeup_junior_brides: Joi.array().items({
               quantity: Joi.number().required(),
               price: Joi.number().required(),
          }).required(),
          makeup_bridal_parties: Joi.array().items({
               quantity: Joi.number().required(),
               price: Joi.number().required(),
          }).required(),
          mother_of_bride_makeup: Joi.array().items({
               name: Joi.string().required(),
               quantity: Joi.number().required(),
               price: Joi.number().required(),
          }).required(),
          mother_of_groom_makeup: Joi.array().items({
               name: Joi.string().required(),
               quantity: Joi.number().required(),
               price: Joi.number().required(),
          }),
          groom_makeup: Joi.array().items({
               name: Joi.string().required(),
               quantity: Joi.number().required(),
               price: Joi.number().required(),
          }),
          bottom_lashes: Joi.array().items({
               name: Joi.string().required(),
               quantity: Joi.number().required(),
               price: Joi.number().required(),
          }),
          // trial_session_date: Joi.string(),
          // trial_session_time: Joi.string(),
          question_allergies: Joi.string().valid(QUESTION.YES, QUESTION.NO).default(QUESTION.NO).required(),
          question_picture: Joi.string().valid(QUESTION.YES, QUESTION.NO).required(),
          hear_about_us: Joi.string().required(),
          terms_condition: Joi.string().default(SERVICE.TERM_CONDITION.YES).required(),
          status: Joi.string()
               .valid(INVOICE.STATUS.FULL_PAYMENT,
                    INVOICE.STATUS.HALF_PAYMENT)
               .default(INVOICE.STATUS.FULL_PAYMENT).required()

     }
     return validate(schema, body)
}

