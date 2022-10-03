const express = require('express')
const { graphqlHTTP } = require('express-graphql')
const graphql = require('graphql')
const { Client } = require('pg')
const joinMonster = require('join-monster')

const client = new Client({
    host: "localhost",
    user: "alikazmi",
    password: "alikazmi",
    database: "graphql"
})
client.connect()
// Define the schema
const Organisation = new graphql.GraphQLObjectType({
    name: 'Organisation',
    fields: () => ({
        id: { type: graphql.GraphQLString },
        name: { type: graphql.GraphQLString },

    })
});

Organisation._typeConfig = {
    sqlTable: 'organisations',
    uniqueKey: 'id',
}

const User = new graphql.GraphQLObjectType({
    name: 'User',
    fields: () => ({
        id: { type: graphql.GraphQLString },
        first_name: { type: graphql.GraphQLString },
        email: { type: graphql.GraphQLString },
        last_name: { type: graphql.GraphQLString },
        org_id: {
            type: Organisation,
            sqlJoin: (userTable, orgTable, args) => `${userTable}.org_id = ${orgTable}.id`
        }
    })
});

User._typeConfig = {
    sqlTable: 'users',
    uniqueKey: 'id',
}


const Room = new graphql.GraphQLObjectType({
    name: 'Room',
    fields: () => ({
        id: { type: graphql.GraphQLString },
        name: { type: graphql.GraphQLString },
        org_id: {
            type: Organisation,
            sqlJoin: (roomTable, orgTable, args) => `${roomTable}.org_id = ${orgTable}.id`
        }
    })
});

Room._typeConfig = {
    sqlTable: 'rooms',
    uniqueKey: 'id',
}

const Device = new graphql.GraphQLObjectType({
    name: 'Device',
    fields: () => ({
        id: { type: graphql.GraphQLString },
        name: { type: graphql.GraphQLString },
        org_id: {
            type: Organisation,
            sqlJoin: (deviceTable, orgTable, args) => `${deviceTable}.org_id = ${orgTable}.id`
        }
    })
});

Device._typeConfig = {
    sqlTable: 'devices',
    uniqueKey: 'id',
}

const MutationRoot = new graphql.GraphQLObjectType({
    name: 'Mutation',
    fields: () => ({
        organisations: {
            type: Organisation,
            args: {
                name: { type: graphql.GraphQLNonNull(graphql.GraphQLString) },
            },
            resolve: async (parent, args, context, resolveInfo) => {
                try {
                    return (await client.query("INSERT INTO organisations (name) VALUES ($1) RETURNING *", [args.name])).rows[0]
                } catch (err) {
                    throw new Error("Failed to insert new organisations")
                }
            }
        },
        rooms: {
            type: Room,
            args: {
                name: { type: graphql.GraphQLNonNull(graphql.GraphQLString) },
                org_id: { type: graphql.GraphQLNonNull(graphql.GraphQLInt) },
            },
            resolve: async (parent, args, context, resolveInfo) => {
                try {
                    return (await client.query("INSERT INTO rooms (name,org_id) VALUES ($1,$2) RETURNING *", [args.name, args.org_id])).rows[0]
                } catch (err) {
                    throw new Error("Failed to insert new rooms")
                }
            }
        },
        devices: {
            type: Device,
            args: {
                name: { type: graphql.GraphQLNonNull(graphql.GraphQLString) },
                org_id: { type: graphql.GraphQLNonNull(graphql.GraphQLInt) },
            },
            resolve: async (parent, args, context, resolveInfo) => {
                try {
                    return (await client.query("INSERT INTO devices (name,org_id) VALUES ($1,$2) RETURNING *", [args.name, args.org_id])).rows[0]
                } catch (err) {
                    throw new Error("Failed to insert new devices")
                }
            }
        },
        users: {
            type: User,
            args: {
                first_name: { type: graphql.GraphQLNonNull(graphql.GraphQLString) },
                last_name: { type: graphql.GraphQLNonNull(graphql.GraphQLString) },
                email: { type: graphql.GraphQLNonNull(graphql.GraphQLString) },
                org_id: { type: graphql.GraphQLNonNull(graphql.GraphQLInt) },
            },
            resolve: async (parent, args, context, resolveInfo) => {
                try {
                    return (await client.query("INSERT INTO users (first_name,last_name,email,org_id) VALUES ($1,$2,$3,$4) RETURNING *",
                     [args.first_name, args.last_name, args.email, args.org_id])).rows[0]
                } catch (err) {
                    throw new Error("Failed to insert new users")
                }
            }
        }
    })
})

const QueryRoot = new graphql.GraphQLObjectType({
    name: 'Query',
    fields: () => ({

        organisations: {
            type: new graphql.GraphQLList(Organisation),
            resolve: (parent, args, context, resolveInfo) => {
                return joinMonster.default(resolveInfo, {}, sql => {
                    return client.query(sql)
                })
            }
        },
        organisation: {
            type: Organisation,
            args: { id: { type: graphql.GraphQLNonNull(graphql.GraphQLInt) } },
            where: (organistaionTable, args, context) => `${organistaionTable}.id = ${args.id}`,
            resolve: (parent, args, context, resolveInfo) => {
                return joinMonster.default(resolveInfo, {}, sql => {
                    return client.query(sql)
                })
            }
        }
    })
})

const schema = new graphql.GraphQLSchema({
    query: QueryRoot,
    mutation: MutationRoot
});

const app = express();
app.use('/api', graphqlHTTP({
    schema: schema,
    graphiql: true,
}));
app.listen(4000);