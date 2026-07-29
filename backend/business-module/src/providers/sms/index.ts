import { env } from '@/config/env';
import { getSecrets } from '@/config/secrets';
import type { ISmsProvider } from './interface';

export type { ISmsProvider } from './interface';
export type { SendSmsInput, SendSmsResult } from './interface';

let instance: ISmsProvider | null = null;

export function getSmsProvider(): ISmsProvider {
    if (instance !== null) return instance;

    let created: ISmsProvider;

    if (env.sms.provider === 'twilio') {
        // eslint-disable-next-line @typescript-eslint/no-require-imports -- intentional lazy require, keeps the stub path free of live-provider imports until needed
        const { TwilioSmsProvider } = require('./live');
        const s = getSecrets();
        created = new TwilioSmsProvider(
            s.twilio.accountSid,
            s.twilio.authToken,
            s.twilio.fromNumber,
        );
    } else if (env.sms.provider === 'msg91') {
        // eslint-disable-next-line @typescript-eslint/no-require-imports -- intentional lazy require
        const { Msg91SmsProvider } = require('./live');
        const s = getSecrets();
        created = new Msg91SmsProvider(
            s.msg91.authKey,
            s.msg91.senderId,
            s.msg91.templateId,
        );
    } else {
        // eslint-disable-next-line @typescript-eslint/no-require-imports -- intentional lazy require
        const { StubSmsProvider } = require('./stub');
        created = new StubSmsProvider();
    }

    instance = created;
    return created;
}

export function _resetSmsProvider(): void { instance = null; }
