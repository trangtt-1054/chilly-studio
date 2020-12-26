import Hapi from '@hapi/hapi';
import Joi from 'joi';
import Boom from '@hapi/boom';
import sendgrid from '@sendgrid/mail';

// Module augmentation to add shared application state
// https://github.com/DefinitelyTyped/DefinitelyTyped/issues/33809#issuecomment-472103564
declare module '@hapi/hapi' {
  interface ServerApplicationState {
    //this is like modifying the type of ServerSpplicationState
    sendEmailToken(email: string, token: string): Promise<void>;
  }
}

const emailPlugin = {
  name: 'app/email',
  register: async function (server: Hapi.Server) {
    if (!process.env.SENDGRID_API_KEY) {
      server.log(
        'warn',
        `The SENDGRID_API_KEY env var must be set, otherwise the API won't be able to send emails. Using debug mode which logs the email tokens instead.`
      );
      //in debug mode we don't want to send too many emails
      //server.app is an object accessible in all the request in the application
      server.app.sendEmailToken = debugSendEmailToken;
    } else {
      sendgrid.setApiKey(process.env.SENDGRID_API_KEY);
      server.app.sendEmailToken = sendEmailToken;
    }
  },
};

export default emailPlugin;

//make a call to sendgrid api
async function sendEmailToken(email: string, token: string) {
  const msg = {
    to: email,
    from: 'norman@prisma.io',
    subject: 'Login token for the modern backend API',
    text: `The login token for the API is: ${token}`,
  };

  await sendgrid.send(msg);
}

async function debugSendEmailToken(email: string, token: string) {
  console.log(`email token for ${email}: ${token} `);
}
