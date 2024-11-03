/* eslint-disable @typescript-eslint/no-misused-promises,@typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-explicit-any */
import {FastifyPluginAsyncTypebox} from '@fastify/type-provider-typebox';
import {createGqlResponseSchema, gqlResponseSchema} from './schemas.js';
import {graphql, GraphQLEnumType, GraphQLFloat, GraphQLScalarType, Kind} from 'graphql';
import {
    GraphQLBoolean,
    GraphQLInt,
    GraphQLList,
    GraphQLNonNull,
    GraphQLObjectType,
    GraphQLSchema,
    GraphQLString
} from "graphql/type/index.js";

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
    const {prisma} = fastify;

    const UUIDScalar = new GraphQLScalarType({
        name: 'UUID',
        description: 'A UUID string',
        serialize(value) {
            return value;
        },
        parseValue(value) {
            return value;
        },
        parseLiteral(ast) {
            if (ast.kind === Kind.STRING) {
                return ast.value;
            }
            return null;
        },
    });

    const MemberTypeIdEnum = new GraphQLEnumType({
        name: 'MemberTypeId',
        values: {
            BASIC: {value: 'BASIC'},
            BUSINESS: {value: 'BUSINESS'},
        },
    });

    const MemberTypeType = new GraphQLObjectType({
        name: 'MemberType',
        fields: () => ({
            id: {type: new GraphQLNonNull(MemberTypeIdEnum)},
            discount: {type: new GraphQLNonNull(GraphQLFloat)},
            postsLimitPerMonth: {type: new GraphQLNonNull(GraphQLInt)},
        }),
    });

    const PostType = new GraphQLObjectType({
        name: 'Post',
        fields: () => ({
            id: {type: new GraphQLNonNull(UUIDScalar)},
            title: {type: new GraphQLNonNull(GraphQLString)},
            content: {type: new GraphQLNonNull(GraphQLString)},
            authorId: {type: new GraphQLNonNull(UUIDScalar)},
        }),
    });

    const ProfileType = new GraphQLObjectType({
        name: 'Profile',
        fields: () => ({
            id: {type: new GraphQLNonNull(UUIDScalar)},
            isMale: {type: new GraphQLNonNull(GraphQLBoolean)},
            yearOfBirth: {type: new GraphQLNonNull(GraphQLInt)},
            userId: {type: new GraphQLNonNull(UUIDScalar)},
            memberTypeId: {type: new GraphQLNonNull(MemberTypeIdEnum)},
            memberType: {
                type: MemberTypeType,
                resolve: (parent) => prisma.memberType.findUnique({where: {id: parent.memberTypeId}}),
            },
        }),
    });

    const UserType = new GraphQLObjectType({
        name: 'User',
        fields: () => ({
            id: {type: new GraphQLNonNull(UUIDScalar)},
            name: {type: new GraphQLNonNull(GraphQLString)},
            balance: {type: new GraphQLNonNull(GraphQLFloat)},
            posts: {
                type: new GraphQLList(PostType),
                resolve: (parent) => prisma.post.findMany({where: {authorId: parent.id}}),
            },
            profile: {
                type: ProfileType,
                resolve: (parent) => prisma.profile.findUnique({where: {userId: parent.id}}),
            },
            userSubscribedTo: {
                type: new GraphQLList(UserType),
                resolve: (parent) => prisma.subscribersOnAuthors.findMany({
                    where: {subscriberId: parent.id},
                    select: {author: true},
                }).then(subs => subs.map(sub => sub.author)),
            },
            subscribedToUser: {
                type: new GraphQLList(UserType),
                resolve: (parent) => prisma.subscribersOnAuthors.findMany({
                    where: {authorId: parent.id},
                    select: {subscriber: true},
                }).then(subs => subs.map(sub => sub.subscriber)),
            },
        }),
    });

    const QueryType = new GraphQLObjectType({
        name: 'Query',
        fields: {
            memberTypes: {
                type: new GraphQLList(MemberTypeType),
                resolve: () => prisma.memberType.findMany(),
            },
            memberType: {
                type: MemberTypeType,
                args: {id: {type: new GraphQLNonNull(MemberTypeIdEnum)}},
                resolve: (_, {id}) => prisma.memberType.findUnique({where: {id}}),
            },
            posts: {
                type: new GraphQLList(PostType),
                resolve: () => prisma.post.findMany(),
            },
            post: {
                type: PostType,
                args: {id: {type: new GraphQLNonNull(UUIDScalar)}},
                resolve: (_, {id}) => prisma.post.findUnique({where: {id}}),
            },
            profiles: {
                type: new GraphQLList(ProfileType),
                resolve: () => prisma.profile.findMany(),
            },
            profile: {
                type: ProfileType,
                args: {id: {type: new GraphQLNonNull(UUIDScalar)}},
                resolve: (_, {id}) => prisma.profile.findUnique({where: {id}}),
            },
            users: {
                type: new GraphQLList(UserType),
                resolve: () => prisma.user.findMany(),
            },
            user: {
                type: UserType,
                args: {id: {type: new GraphQLNonNull(UUIDScalar)}},
                resolve: (_, {id}) => prisma.user.findUnique({where: {id}}),
            },
        },
    });

//todo fix
    const MutationType = new GraphQLObjectType({
        name: 'Mutation',
        fields: {
            createPost: {
                type: PostType,
                args: {
                    title: {type: new GraphQLNonNull(GraphQLString)},
                    content: {type: new GraphQLNonNull(GraphQLString)},
                    authorId: {type: new GraphQLNonNull(GraphQLString)},
                },
                resolve: (_, args) => prisma.post.create({data: args}),
            },
            updatePost: {
                type: PostType,
                args: {
                    id: {type: new GraphQLNonNull(GraphQLString)},
                    title: {type: GraphQLString},
                    content: {type: GraphQLString},
                },
                resolve: (_, {id, ...args}: { id: string }) => prisma.post.update({where: {id}, data: args}),
            },
            deletePost: {
                type: PostType,
                args: {id: {type: new GraphQLNonNull(GraphQLString)}},
                resolve: (_, {id}: { id: string }) => prisma.post.delete({where: {id}}),
            },
            createProfile: {
                type: ProfileType,
                args: {
                    isMale: {type: new GraphQLNonNull(GraphQLBoolean)},
                    yearOfBirth: {type: new GraphQLNonNull(GraphQLInt)},
                    userId: {type: new GraphQLNonNull(GraphQLString)},
                    memberTypeId: {type: new GraphQLNonNull(GraphQLString)},
                },
                resolve: (_, args) => prisma.profile.create({data: args}),
            },
            updateProfile: {
                type: ProfileType,
                args: {
                    id: {type: new GraphQLNonNull(GraphQLString)},
                    isMale: {type: GraphQLBoolean},
                    yearOfBirth: {type: GraphQLInt},
                    memberTypeId: {type: GraphQLString},
                },
                resolve: (_, {id, ...args}: { id: string }) => prisma.profile.update({where: {id}, data: args}),
            },
            deleteProfile: {
                type: ProfileType,
                args: {id: {type: new GraphQLNonNull(GraphQLString)}},
                resolve: (_, {id}: { id: string }) => prisma.profile.delete({where: {id}}),
            },
        },
    });

    const schema = new GraphQLSchema({
        query: QueryType,
        mutation: MutationType,
    });

    fastify.route({
        url: '/',
        method: 'POST',
        schema: {
            ...createGqlResponseSchema,
            response: {
                200: gqlResponseSchema,
            },
        },
        async handler(req) {
            const {query, variables} = req.body as { query: string; variables?: Record<string, string> };
            const result = await graphql({
                schema,
                source: query,
                variableValues: variables,
                contextValue: {prisma},
            });

            return {
                data: result.data || null,
                errors: result.errors ? result.errors.map(e => ({
                    message: e.message,
                    locations: e.locations,
                    path: e.path,
                    extensions: e.extensions,
                })) : undefined
            }
        },
    });
};

export default plugin;