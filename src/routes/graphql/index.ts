/* eslint-disable @typescript-eslint/no-misused-promises,@typescript-eslint/no-unsafe-assignment,@typescript-eslint/no-unsafe-member-access,@typescript-eslint/no-explicit-any */
import {FastifyPluginAsyncTypebox} from '@fastify/type-provider-typebox';
import {createGqlResponseSchema, gqlResponseSchema} from './schemas.js';
import {graphql, GraphQLEnumType, GraphQLFloat, GraphQLInputObjectType, GraphQLScalarType, Kind} from 'graphql';
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

    const CreatePostInput = new GraphQLInputObjectType({
        name: 'CreatePostInput',
        fields: {
            title: {type: new GraphQLNonNull(GraphQLString)},
            content: {type: new GraphQLNonNull(GraphQLString)},
            authorId: {type: new GraphQLNonNull(UUIDScalar)},
        },
    });

    const CreateUserInput = new GraphQLInputObjectType({
        name: 'CreateUserInput',
        fields: {
            name: {type: new GraphQLNonNull(GraphQLString)},
            balance: {type: new GraphQLNonNull(GraphQLFloat)},
        },
    });

    const CreateProfileInput = new GraphQLInputObjectType({
        name: 'CreateProfileInput',
        fields: {
            isMale: {type: new GraphQLNonNull(GraphQLBoolean)},
            yearOfBirth: {type: new GraphQLNonNull(GraphQLInt)},
            userId: {type: new GraphQLNonNull(UUIDScalar)},
            memberTypeId: {type: new GraphQLNonNull(MemberTypeIdEnum)},
        },
    });

    const ChangePostInput = new GraphQLInputObjectType({
        name: 'ChangePostInput',
        fields: {
            title: {type: GraphQLString},
            content: {type: GraphQLString},
        },
    });

    const ChangeProfileInput = new GraphQLInputObjectType({
        name: 'ChangeProfileInput',
        fields: {
            isMale: {type: GraphQLBoolean},
            yearOfBirth: {type: GraphQLInt},
            memberTypeId: {type: MemberTypeIdEnum},
        },
    });

    const ChangeUserInput = new GraphQLInputObjectType({
        name: 'ChangeUserInput',
        fields: {
            name: {type: GraphQLString},
            balance: {type: GraphQLFloat},
        },
    });

    const MutationType = new GraphQLObjectType({
        name: 'Mutation',
        fields: {
            createPost: {
                type: PostType,
                args: {
                    dto: {type: new GraphQLNonNull(CreatePostInput)},
                },
                resolve: (_, {dto}) => prisma.post.create({data: dto}),
            },
            createUser: {
                type: UserType,
                args: {
                    dto: {type: new GraphQLNonNull(CreateUserInput)},
                },
                resolve: (_, {dto}) => prisma.user.create({data: dto}),
            },
            createProfile: {
                type: ProfileType,
                args: {
                    dto: {type: new GraphQLNonNull(CreateProfileInput)},
                },
                resolve: (_, {dto}) => prisma.profile.create({data: dto}),
            },
            deletePost: {
                type: GraphQLBoolean,
                args: {
                    id: {type: new GraphQLNonNull(UUIDScalar)},
                },
                resolve: async (_, {id}) => {
                    await prisma.post.delete({where: {id}});
                    return true;
                },
            },
            deleteProfile: {
                type: GraphQLBoolean,
                args: {
                    id: {type: new GraphQLNonNull(UUIDScalar)},
                },
                resolve: async (_, {id}) => {
                    await prisma.profile.delete({where: {id}});
                    return true;
                },
            },
            deleteUser: {
                type: GraphQLBoolean,
                args: {
                    id: {type: new GraphQLNonNull(UUIDScalar)},
                },
                resolve: async (_, {id}) => {
                    await prisma.user.delete({where: {id}});
                    return true;
                },
            },
            changePost: {
                type: PostType,
                args: {
                    id: {type: new GraphQLNonNull(UUIDScalar)},
                    dto: {type: new GraphQLNonNull(ChangePostInput)},
                },
                resolve: (_, {id, dto}) => prisma.post.update({where: {id}, data: dto}),
            },
            changeProfile: {
                type: ProfileType,
                args: {
                    id: {type: new GraphQLNonNull(UUIDScalar)},
                    dto: {type: new GraphQLNonNull(ChangeProfileInput)},
                },
                resolve: (_, {id, dto}) => prisma.profile.update({where: {id}, data: dto}),
            },
            changeUser: {
                type: UserType,
                args: {
                    id: {type: new GraphQLNonNull(UUIDScalar)},
                    dto: {type: new GraphQLNonNull(ChangeUserInput)},
                },
                resolve: (_, {id, dto}) => prisma.user.update({where: {id}, data: dto}),
            },
            subscribeTo: {
                type: GraphQLBoolean,
                args: {
                    userId: {type: new GraphQLNonNull(UUIDScalar)},
                    authorId: {type: new GraphQLNonNull(UUIDScalar)},
                },
                resolve: async (_, {userId, authorId}) => {
                    await prisma.subscribersOnAuthors.create({
                        data: {
                            subscriberId: userId,
                            authorId: authorId,
                        },
                    });
                    return true;
                },
            },
            unsubscribeFrom: {
                type: GraphQLBoolean,
                args: {
                    userId: {type: new GraphQLNonNull(UUIDScalar)},
                    authorId: {type: new GraphQLNonNull(UUIDScalar)},
                },
                resolve: async (_, {userId, authorId}) => {
                    await prisma.subscribersOnAuthors.delete({
                        where: {
                            subscriberId_authorId: {
                                subscriberId: userId,
                                authorId: authorId,
                            },
                        },
                    });
                    return true;
                },
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