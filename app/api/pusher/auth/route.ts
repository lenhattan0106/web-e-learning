import { NextResponse } from "next/server";
import Pusher from "pusher";
import { env } from "@/lib/env";
import { auth } from "@/lib/auth"; // Assuming auth setup
import { headers } from "next/headers";

export async function POST(req: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const body = await req.formData();
  const socketId = body.get("socket_id") as string;
  const channelName = body.get("channel_name") as string;

  const pusher = new Pusher({
    appId: env.PUSHER_APP_ID,
    key: env.NEXT_PUBLIC_PUSHER_KEY,
    secret: env.PUSER_SERCET,
    cluster: "ap1",
    useTLS: true,
  });

  const presenceData = {
    user_id: session.user.id,
    user_info: {
      name: session.user.name,
      image: session.user.image,
    },
  };

  const authResponse = pusher.authorizeChannel(socketId, channelName, presenceData);

  return NextResponse.json(authResponse);
}
