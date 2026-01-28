import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as MicrosoftStrategy } from 'passport-microsoft';
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Serialize User
passport.serializeUser((user: any, done) => {
    done(null, user.id);
});

// Deserialize User
passport.deserializeUser(async (id: string, done) => {
    try {
        const user = await prisma.user.findUnique({ where: { id } });
        done(null, user);
    } catch (err) {
        done(err, null);
    }
});

// Local Strategy
passport.use(
    new LocalStrategy(
        { usernameField: 'email' },
        async (email, password, done) => {
            try {
                const user = await prisma.user.findUnique({ where: { email } });
                if (!user || !user.passwordHash) {
                    return done(null, false, { message: 'Incorrect email or password.' });
                }

                const isMatch = await bcrypt.compare(password, user.passwordHash);
                if (!isMatch) {
                    return done(null, false, { message: 'Incorrect email or password.' });
                }

                return done(null, user);
            } catch (err) {
                return done(err);
            }
        }
    )
);

// Microsoft Strategy
if (process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET) {
    passport.use(
        new MicrosoftStrategy(
            {
                clientID: process.env.MICROSOFT_CLIENT_ID,
                clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
                callbackURL: process.env.MICROSOFT_CALLBACK_URL || 'http://localhost:4001/api/auth/microsoft/callback',
                scope: ['user.read'],
            },
            async (accessToken: string, refreshToken: string, profile: any, done: any) => {
                try {
                    const email = profile.emails?.[0]?.value;
                    if (!email) return done(new Error('No email found in Microsoft profile'));

                    // Find or Create User
                    let user = await prisma.user.findUnique({ where: { email } });

                    if (!user) {
                        user = await prisma.user.create({
                            data: {
                                email,
                                name: profile.displayName,
                                provider: 'MICROSOFT',
                                providerId: profile.id,
                                role: 'USER', // Default role
                            },
                        });
                    } else if (user.provider !== 'MICROSOFT') {
                        // Optional: Link account logic if needed, for now just update
                        await prisma.user.update({
                            where: { id: user.id },
                            data: { provider: 'MICROSOFT', providerId: profile.id } // Upgrade to MS auth? Or just allow login?
                        });
                    }

                    return done(null, user);
                } catch (err) {
                    return done(err);
                }
            }
        )
    );
}

export default passport;
