# User Service Documentation

## Overview

- Handles the creating, authorization and authentication of users, providers and sub-account.
- Verification of email and phoneNumber

    Type : Standalone
    ModeIn : Rest
    ModeOut : Rest

## Dependencies

- RabbitMQ
- MongoDB
- Elasticsearch
- Redis

## Services Dependencies

- Client Service
- Notification Service

## Server :

    Provider: Managed Kubernetes
    type: managed
    Name: user-service

## Backend:

    - URL : https://bitbucket.org/padf/user-service
    - API Documentation : https://userservice34.docs.apiary.io
    - Language : Nodejs (xpress framework)

## Feature List

- [x] Authentication
- [x] Authorization
- [x] User Profile
- [x] Password Reset

## Database:

    kind: MongoDB
    type: managed
    server: Atlas
    db-name : micro_user_(NODE_ENV)

## Input/Output

Input/output talks about other standalone service that is connected to this system to exchange information.

### Ingres connection

### Engress connection

1. RabbitMQ: The application broadcasts events generated within itself to a rabbitMQ exchanges for other services
   needing it to make use of it. Examples of such events are user.created, user.updated e.t.c.
2. Elasticsearch: This system spools a flat copy of users details to ES so the system can have a super search
   functionality

## Setting up for Development

- Clone project.
- Install Node ( >= 22.0.0).
- Install yarn/npm.
- Copy .env.example to .env file
- Run yarn/npm install.
- Run yarn/npm start.

## Execute
- yarn/npm start.
