import { handleWaitlistRequest } from '../_shared/waitlist.mjs';

Deno.serve((request: Request) => handleWaitlistRequest(request, Deno.env.toObject()));
