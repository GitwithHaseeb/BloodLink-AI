import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import { getDb } from "../db/sqlite.js";

dotenv.config();

const conversations = [];

const groqApiKey = process.env.GROQ_API_KEY;
const geminiApiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GOOGLE_GENAI_API_KEY;

const groq =
    groqApiKey && String(groqApiKey).trim().toLowerCase().startsWith("gsk_") ? new Groq({ apiKey: groqApiKey }) : null;

const gemini =
    geminiApiKey && String(geminiApiKey).trim().startsWith("AIza")
        ? new GoogleGenerativeAI(String(geminiApiKey).trim())
        : geminiApiKey
          ? new GoogleGenerativeAI(String(geminiApiKey).trim())
          : null;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const parseRetrySeconds = (text) => {
    const match = String(text || "").match(/Please retry in\s+([0-9]+(?:\.[0-9]+)?)s/i);
    if (!match) return null;
    const seconds = Number(match[1]);
    if (!Number.isFinite(seconds)) return null;
    return Math.min(Math.max(Math.ceil(seconds * 1000), 250), 60_000);
};

const geminiModelCandidates = () => {
    const primary = (process.env.GEMINI_MODEL || "gemini-2.0-flash").trim();
    const raw = process.env.GEMINI_MODEL_FALLBACKS || "gemini-2.0-flash-001,gemini-1.5-flash,gemini-1.5-flash-8b";
    const fallbacks = raw
        .split(",")
        .map((m) => m.trim())
        .filter(Boolean);

    return Array.from(new Set([primary, ...fallbacks]));
};

const trimHistory = (messages, maxMessages = 12) => {
    if (messages.length <= maxMessages) return messages;
    return messages.slice(messages.length - maxMessages);
};

const offlineKnowledgeReply = (message) => {
    const lower = String(message || "").toLowerCase();

    if (
        lower.includes("after donation") ||
        lower.includes("post donation") ||
        lower.includes("care tips") ||
        (lower.includes("care") && lower.includes("donat")) ||
        (lower.includes("tips") && (lower.includes("donat") || lower.includes("blood")))
    ) {
        return [
            "After donation care (general guidance):",
            "- Rest 10–15 minutes at the donation site; drink extra water the same day.",
            "- Keep the bandage on for several hours; avoid heavy lifting with that arm today.",
            "- Eat a normal meal; include protein + iron-rich foods if you can.",
            "- If you feel dizzy, lie down and elevate your feet; seek urgent care if symptoms are severe or persistent.",
            "",
            "This is not medical advice—follow the staff instructions at your hospital/clinic."
        ].join("\n");
    }

    if (
        (lower.includes("bring") && (lower.includes("hospital") || lower.includes("donation"))) ||
        lower.includes("what should i bring") ||
        lower.includes("what to bring")
    ) {
        return [
            "What to bring (typical checklist):",
            "- Original CNIC/NICOP (or hospital-required ID)",
            "- A list of medications you take (if any)",
            "- A water bottle (if allowed) and a small snack for after donation",
            "- Wear sleeves that roll up easily; avoid tight sleeves",
            "",
            "Hospitals may have different rules—confirm with the facility you visit."
        ].join("\n");
    }

    if (
        lower.includes("before donation") ||
        (lower.includes("eat") && lower.includes("before")) ||
        lower.includes("fasting") ||
        lower.includes("food before")
    ) {
        return [
            "Before donation (general guidance):",
            "- Eat a normal meal a few hours before; avoid arriving on an empty stomach unless staff told you otherwise.",
            "- Drink water; avoid alcohol for 24 hours before donation (many centers advise this).",
            "- Sleep reasonably well the night before.",
            "",
            "Follow the exact instructions of the hospital/blood bank you visit."
        ].join("\n");
    }

    if (
        lower.includes("iron") ||
        lower.includes("hemoglobin") ||
        lower.includes("hb low") ||
        (lower.includes("foods") && (lower.includes("blood") || lower.includes("donat")))
    ) {
        return [
            "Iron-rich foods (general nutrition ideas, not a prescription):",
            "- Lean meat, eggs, lentils/beans, spinach, nuts, dates, fortified cereals (examples).",
            "- Vitamin C (citrus, tomatoes) can help iron absorption with meals.",
            "- Tea/coffee with meals can reduce iron absorption for some people.",
            "",
            "If you were deferred for low hemoglobin, follow your clinician’s advice and re-check as they direct."
        ].join("\n");
    }

    if (
        lower.includes("exercise") ||
        lower.includes("gym") ||
        lower.includes("workout") ||
        lower.includes("sport")
    ) {
        return [
            "Activity after donation (general guidance):",
            "- Avoid heavy lifting and intense exercise for the rest of the day for whole blood (centers vary).",
            "- Light walking is usually fine if you feel well.",
            "- If you feel faint, stop and rest/hydrate; seek help if symptoms are severe.",
            "",
            "Follow the post-donation advice given at your donation site."
        ].join("\n");
    }

    if (
        lower.includes("first time") ||
        lower.includes("nervous") ||
        lower.includes("scared") ||
        lower.includes("afraid of needles")
    ) {
        return [
            "First-time donation tips (general):",
            "- Tell staff you are donating for the first time—they will guide you step by step.",
            "- Hydrate and eat normally beforehand; ask if you feel dizzy at any point.",
            "- The needle sting is brief; distraction (breathing slowly) helps some donors.",
            "",
            "You can stop at any time if you feel unwell—staff are trained to help."
        ].join("\n");
    }

    if (
        lower.includes("how often") ||
        lower.includes("how many times") ||
        lower.includes("frequency") ||
        lower.includes("donate again")
    ) {
        return [
            "How often you can donate (typical ranges—rules differ by country/center/product):",
            "- Whole blood: often around every 8–12 weeks for males and sometimes longer spacing for females (varies).",
            "- Platelets/plasma: different intervals; only the center can confirm for you.",
            "",
            "Always follow the deferral dates and medical advice from your screening staff."
        ].join("\n");
    }

    if (
        lower.includes("platelet") ||
        lower.includes("plasma") ||
        lower.includes("whole blood") ||
        lower.includes("types of donation")
    ) {
        return [
            "Types of donation (simple overview):",
            "- Whole blood: common donation; red cells + plasma + platelets collected together (then separated by the lab).",
            "- Platelets/plasma: separate apheresis procedures with different timing and eligibility.",
            "",
            "Ask the hospital/blood bank which product they need and what you qualify for."
        ].join("\n");
    }

    if (
        lower.includes("tattoo") ||
        lower.includes("piercing") ||
        lower.includes("defer") ||
        lower.includes("travel") ||
        lower.includes("medication") ||
        lower.includes("medicine")
    ) {
        return [
            "Deferrals (general education):",
            "- Many centers temporarily defer donors after some tattoos/piercings, travel to certain regions, illnesses, or specific medications/vaccines.",
            "- The exact deferral window depends on local regulations and your health history.",
            "",
            "Only screening staff at the donation site can tell you if you are cleared today."
        ].join("\n");
    }

    if (
        lower.includes("bruise") ||
        lower.includes("pain") ||
        lower.includes("side effect") ||
        lower.includes("sore arm")
    ) {
        return [
            "Common local effects (general):",
            "- Mild soreness or a small bruise at the needle site can happen.",
            "- Cold compress (if advised) and keeping the arm rested usually helps.",
            "- Seek medical care for spreading redness, severe pain, fever, or anything that worries you.",
            "",
            "This is not medical advice—contact a clinician if you are unsure."
        ].join("\n");
    }

    if (lower.includes("eligib")) {
        return [
            "Eligibility basics (general education, not a medical clearance):",
            "- Age is commonly 18–65 for whole blood (centers vary).",
            "- You should feel well (no fever/cold), and meet weight requirements set by the center.",
            "- Some medicines, travel history, or recent procedures can temporarily defer donation.",
            "",
            "Final eligibility is decided only by screening staff at the donation site."
        ].join("\n");
    }

    if (lower.includes("compatibility") || lower.includes("compatible") || lower.includes("who can donate")) {
        return [
            "Blood compatibility (very simplified):",
            "- Donation matching depends on the product (whole blood vs platelets etc.) and hospital rules.",
            "- Universal red cell donor is often O-; universal plasma rules differ.",
            "",
            "If you tell me donor blood group + needed group, I can explain the common whole-blood pattern used in many charts."
        ].join("\n");
    }

    return null;
};

const genericDonationAssistantReply = () =>
    [
        "I can help with BloodLink basics and general donation education in English.",
        "",
        "Try these in chat:",
        "- Donors: open requests",
        "- Hospitals: find donors",
        "",
        "General topics I can cover: before/after care, what to bring, eligibility basics, iron-rich foods, recovery/activity guidance.",
        "",
        "For personal medical decisions, please speak with qualified hospital staff or your doctor."
    ].join("\n");

const runGemini = async (system, messages) => {
    if (!gemini) return null;

    const models = geminiModelCandidates();
    let lastError = null;

    for (const modelName of models) {
        try {
            const model = gemini.getGenerativeModel({ model: modelName });
            const history = trimHistory(messages).map((m) => ({
                role: m.role === "assistant" ? "model" : "user",
                parts: [{ text: m.content }]
            }));

            const result = await model.generateContent({
                systemInstruction: { role: "system", parts: [{ text: system }] },
                contents: history
            });

            return result.response.text();
        } catch (error) {
            lastError = error;
            const text = String(error?.message || error);
            const retryMs = parseRetrySeconds(text);
            const is429 = text.includes("429") || text.toLowerCase().includes("quota");

            if (is429 && retryMs) {
                await sleep(retryMs);
            }

            // try next model candidate
        }
    }

    throw lastError || new Error("Gemini request failed");
};

const runGroqChat = async (system, messages) => {
    if (!groq) return null;
    const completion = await groq.chat.completions.create({
        model: (process.env.GROQ_MODEL || "llama-3.3-70b-versatile").trim(),
        temperature: 0.6,
        max_tokens: 700,
        messages: [
            { role: "system", content: system },
            ...trimHistory(messages).map((m) => ({
                role: m.role === "assistant" ? "assistant" : "user",
                content: m.content
            }))
        ]
    });
    const text = completion.choices[0]?.message?.content;
    return text && String(text).trim() ? String(text).trim() : null;
};

const commandReply = async (message, user) => {
    const lower = message.toLowerCase();

    if (lower.includes("find donors")) {
        const db = getDb();
        const donors = db
            .prepare(
                `SELECT name, blood_group, city, contact, email
                 FROM users
                 WHERE role = 'donor' AND lower(city) = lower(?)
                 ORDER BY datetime(created_at) DESC
                 LIMIT 10`
            )
            .all(user.city);
        if (!donors.length) return "No donors found in your city for that filter.";
        return donors
            .map((donor) => `${donor.name} | ${donor.blood_group} | ${donor.city} | ${donor.contact || "-"}`)
            .join("\n");
    }

    if (lower.includes("nearby request") || lower.includes("open requests")) {
        const db = getDb();
        const requests = db
            .prepare(
                `SELECT r.needed_blood_group, r.units_needed, r.urgency, u.hospital_name, u.name AS hospital_account_name, u.contact
                 FROM requests r
                 JOIN users u ON u.id = r.hospital_id
                 WHERE lower(r.city) = lower(?) AND r.status IN ('open','in_progress')
                 ORDER BY datetime(r.created_at) DESC
                 LIMIT 10`
            )
            .all(user.city);
        if (!requests.length) return "No open blood requests in your city right now.";
        return requests
            .map(
                (request) =>
                    `${request.hospital_name || request.hospital_account_name || "Hospital"} needs ${
                        request.needed_blood_group
                    }, units: ${request.units_needed}, urgency: ${request.urgency} | contact: ${request.contact || "-"}`
            )
            .join("\n");
    }

    return null;
};

export const sendMessage = async (req, res, next) => {
    try {
        const { message, conversationId } = req.body;
        if (!message || !String(message).trim()) {
            return res.status(400).json({ error: "Message is required" });
        }

        const db = getDb();
        const user = db
            .prepare("SELECT role, city, blood_group, hospital_name FROM users WHERE id = ?")
            .get(Number(req.user.id));
        let conversation = conversations.find((item) => item.id === conversationId);
        if (!conversation) {
            conversation = { id: Date.now().toString(), messages: [] };
            conversations.push(conversation);
        }

        conversation.messages.push({ role: "user", content: message });

        let reply = await commandReply(message, {
            city: user.city,
            bloodGroup: user.blood_group,
            role: user.role,
            hospitalName: user.hospital_name
        });

        const systemPrompt =
            "You are BloodLink assistant. Reply in clear English (simple wording). " +
            "Help with donor/hospital workflow, blood group compatibility basics, portal usage, safety tips, and general donation education. " +
            "If the user asks for medical diagnosis or personal medical decisions, refuse and tell them to consult qualified medical staff. " +
            "Never ask for passwords. Do not claim you accessed private data beyond what the user provided in chat. " +
            "Prefer short headings + bullet points. If unsure, ask one clarifying question.";

        if (!reply && !groq && !gemini) {
            reply = offlineKnowledgeReply(message) || genericDonationAssistantReply();
        }

        if (!reply && groq) {
            try {
                reply = await runGroqChat(systemPrompt, conversation.messages);
            } catch {
                /* Groq optional; continue to Gemini / offline */
            }
        }

        if (!reply && gemini) {
            try {
                reply = await runGemini(systemPrompt, conversation.messages);
            } catch {
                /* fall through to offline / generic */
            }
        }

        if (!reply) {
            reply =
                offlineKnowledgeReply(message) ||
                "Thanks for your message. The smart assistant is resting right now, but here is quick help:\n\n" +
                    genericDonationAssistantReply();
        }

        reply = (reply && String(reply).trim()) || genericDonationAssistantReply();

        conversation.messages.push({ role: "assistant", content: reply });
        res.json({ success: true, message: reply, conversationId: conversation.id });
    } catch (error) {
        next(error);
    }
};

export const clearConversation = (req, res) => {
    const idx = conversations.findIndex((item) => item.id === req.params.id);
    if (idx >= 0) conversations.splice(idx, 1);
    res.json({ success: true, message: "Conversation cleared" });
};

export const getConversations = (req, res) => {
    res.json({
        success: true,
        conversations: conversations.map((item) => ({
            id: item.id,
            messageCount: item.messages.length
        }))
    });
};

