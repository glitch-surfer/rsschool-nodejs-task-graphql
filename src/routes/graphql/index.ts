import { FastifyPluginAsyncTypebox } from '@fastify/type-provider-typebox';
import { createGqlResponseSchema, gqlResponseSchema } from './schemas.js';
import { graphql } from 'graphql';

const plugin: FastifyPluginAsyncTypebox = async (fastify) => {
  const { prisma } = fastify;

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
      // return graphql();
    },
  });
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

};

export default plugin;
