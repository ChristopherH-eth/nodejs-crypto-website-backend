import Logger from "../utils/logger.js"
import { database } from "../database.js"
import bcryptjs from "bcryptjs"
import jwt from "jsonwebtoken"
import { TOKEN_KEY } from "../utils/config.js"

/**
 * @file userDAO.js
 * @author 0xChristopher
 * @brief The User Data Access Object handles interactions with user data, and responds to the 
 *      user-controller.
 */

class UserDAO
{
    /**
     * @brief The registerUser() function attempts to register a new user based on submitted credentials.
     * @param firstName User first name
     * @param lastName User last name
     * @param email User email address
     * @param password User password
     * @returns Returns whether the registration was successful or not
     */
    static async registerUser(firstName, lastName, email, password, testFlag)
    {
        // Collection to use
        let collection

        try
        {
            // Check which collection should be accessed
            if (testFlag)
            {
                collection = "test_users"
                Logger.test("Registering new user: " + email)
            }
            else
            {
                collection = "users"
                Logger.info("Registering new user: " + email)
            }

            // Check if the user already exists in the database
            const userExists = await database.collection(collection).findOne({email: email})

            if (!userExists)
            {
                const encryptedPassword = await bcryptjs.hash(password, 10)
                const token = jwt.sign(
                    {userId: email},
                    TOKEN_KEY,
                    {expiresIn: "1h"}
                )
                const userDoc = {
                    firstName: firstName,
                    lastName: lastName,
                    email: email,
                    password: encryptedPassword,
                    token: token
                }

                const userResponse = await database.collection(collection).insertOne(userDoc)

                // Return response and token
                return ({response: userResponse, token: token})
            }
            else
                return ({error: "User exists"})
        }
        catch (e)
        {
            Logger.error(`Unable to register user: ${e}`)

            return {error: e}
        }
    }

    /**
     * @brief The loginUser() function attempts to login a user based on submitted credentials.
     * @param email User email address
     * @param password User password
     * @returns Returns whether the login was successful or not
     */
    static async loginUser(email, password, testFlag)
    {
        // Collection to use
        let collection

        try
        {
            // Check which collection should be accessed
            if (testFlag)
            {
                collection = "test_users"
                Logger.test("Logging in user: " + email)
            }
            else
            {
                collection = "users"
                Logger.info("Logging in user: " + email)
            }

            // Check if the user exists in the database
            const user = await database.collection(collection).findOne({email: email})

            // Validate user credentials
            if (user && (await bcryptjs.compare(password, user.password)))
            {
                const token = jwt.sign(
                    {userId: email},
                    TOKEN_KEY,
                    {expiresIn: "1h"}
                )

                const userResponse = await database.collection(collection).updateOne(
                    {email: email},
                    {$set: {
                        token: token
                    }}
                )

                // Return response and new token
                return ({response: userResponse, token: token, user: user.firstName})
            }
            else
                return ({error: "Invalid credentials"})
        }
        catch (e)
        {
            Logger.error(`Unable to login user: ${e}`)

            return {error: e}
        }
    }

    /**
     * @brief The isLoggedIn() function checks whether the user is currently logged in or not through
     *      use of a JWT token and an Express session.
     * @param req Incoming request
     * @return Returns true if they user currently has an open session and is logged in, or else returns
     *      an error
     */
    static async isLoggedIn(req, testFlag)
    {
        // Collection to use
        let collection

        try
        {
            // Check which collection should be accessed
            if (testFlag)
            {
                collection = "test_users"
                Logger.test("Checking user logged in status: " + req.cookies.user)
            }
            else
            {
                collection = "users"
                Logger.info("Checking user logged in status: " + req.cookies.user)
            }

            const user = await database.collection(collection).findOne({token: req.cookies.user})

            if (req.session === null && user)
                return {error: "Session has expired, please login"}
            else if (!user)
                return {error: "No session found, please login"}
            else
                return true
        }
        catch (e)
        {
            Logger.error(`Unable to check user logged in status: ${e}`)

            return {error: e}
        }
    }
}

export default UserDAO