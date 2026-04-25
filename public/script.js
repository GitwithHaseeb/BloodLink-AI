import { PAK_CITIES } from "./cities.js";

let token = localStorage.getItem("token") || "";
let user = null;
let conversationId = null;

const byId = (id) => document.getElementById(id);

const api = async (url, options = {}) => {
    const response = await fetch(url, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {})
        }
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || data.error || "Request failed");
    return data;
};

const fetchJson = async (url) => {
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || data.error || "Request failed");
    return data;
};

const show = (id) => byId(id).classList.remove("hidden");
const hide = (id) => byId(id).classList.add("hidden");

const setChatStatus = (text, kind = "ok") => {
    const el = byId("chatStatus");
    if (!el) return;
    el.textContent = text;
    el.classList.remove("ok", "muted");
    if (kind === "ok") el.classList.add("ok");
    else el.classList.add("muted");
};

const appendChatMessage = (role, text) => {
    const thread = byId("chatBox");
    if (!thread) return;

    const wrap = document.createElement("div");
    wrap.className = `msg ${role}`;

    const avatar = document.createElement("div");
    avatar.className = "avatar";
    avatar.textContent = role === "user" ? "You" : role === "bot" ? "AI" : "i";

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = text;

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.textContent = new Date().toLocaleString();

    const col = document.createElement("div");
    col.appendChild(bubble);
    col.appendChild(meta);

    wrap.appendChild(avatar);
    wrap.appendChild(col);
    thread.appendChild(wrap);
    thread.scrollTop = thread.scrollHeight;
};

const seedWelcomeChat = () => {
    const thread = byId("chatBox");
    if (!thread) return;
    thread.innerHTML = "";
    appendChatMessage(
        "system",
        "Tip: donors can ask about “open requests”. Hospitals can ask “find donors”. You can also ask general donation questions."
    );
};

const wireQuickChips = () => {
    const chips = byId("chatChips");
    if (!chips) return;
    chips.innerHTML = "";

    const prompts = [
        "open requests",
        "find donors",
        "blood donation eligibility (18-65, healthy)",
        "after donation care tips",
        "how does this portal workflow work?",
        "iron-rich foods before donation",
        "what should I bring to the hospital for donation?"
    ];

    prompts.forEach((p) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "chip";
        b.textContent = p;
        b.addEventListener("click", () => {
            byId("chatInput").value = p;
            sendChatMessage();
        });
        chips.appendChild(b);
    });
};

const populateCitySelect = (selectEl) => {
    if (!selectEl) return;
    const current = selectEl.value;
    selectEl.querySelectorAll("option:not([value=''])").forEach((o) => o.remove());
    PAK_CITIES.forEach((city) => {
        const opt = document.createElement("option");
        opt.value = city;
        opt.textContent = city;
        selectEl.appendChild(opt);
    });
    if (current) selectEl.value = current;
};

const clearEl = (el) => {
    el.innerHTML = "";
};

const renderDonorCard = (donor) => {
    const row = document.createElement("div");
    row.className = "row";

    const title = document.createElement("div");
    title.className = "row-title";
    title.textContent = donor.name || "Donor";

    const meta = document.createElement("div");
    meta.className = "row-meta";
    const bg = document.createElement("span");
    bg.className = "blood";
    bg.textContent = donor.bloodGroup || "-";
    meta.appendChild(bg);
    meta.appendChild(
        document.createTextNode(` • ${donor.city || "-"} • contact: ${donor.contact || "-"} • email: ${donor.email || "-"}`)
    );

    row.appendChild(title);
    row.appendChild(meta);
    return row;
};

const renderHospitalCard = (h) => {
    const row = document.createElement("div");
    row.className = "row";

    const title = document.createElement("div");
    title.className = "row-title";
    title.textContent = h.hospitalName || "Hospital";

    const meta = document.createElement("div");
    meta.className = "row-meta";
    const bg = document.createElement("span");
    bg.className = "blood";
    bg.textContent = h.bloodGroup || "-";
    meta.appendChild(bg);
    meta.appendChild(document.createTextNode(` • ${h.city || "-"} • contact: ${h.contact || "-"} • email: ${h.email || "-"}`));

    row.appendChild(title);
    row.appendChild(meta);
    return row;
};

const runPublicSearch = async (bloodGroup, city) => {
    const donors = await fetchJson(
        `/api/directory/donors?bloodGroup=${encodeURIComponent(bloodGroup)}&city=${encodeURIComponent(city)}`
    );
    const hospitals = await fetchJson(
        `/api/directory/hospitals?bloodGroup=${encodeURIComponent(bloodGroup)}&city=${encodeURIComponent(city)}`
    );

    const donorBox = byId("publicDonors");
    const hospitalBox = byId("publicHospitals");
    clearEl(donorBox);
    clearEl(hospitalBox);

    byId("donorCount").textContent = `${donors.length} results`;
    byId("hospitalCount").textContent = `${hospitals.length} results`;

    if (!donors.length) {
        const empty = document.createElement("div");
        empty.className = "muted";
        empty.textContent = "No donors found for this filter.";
        donorBox.appendChild(empty);
    } else {
        donors.forEach((d) => donorBox.appendChild(renderDonorCard(d)));
    }

    if (!hospitals.length) {
        const empty = document.createElement("div");
        empty.className = "muted";
        empty.textContent = "No hospitals found for this filter.";
        hospitalBox.appendChild(empty);
    } else {
        hospitals.forEach((h) => hospitalBox.appendChild(renderHospitalCard(h)));
    }
};

const updateChatAvailability = () => {
    const lock = byId("chatLock");
    const input = byId("chatInput");
    const send = byId("chatSend");
    const chips = byId("chatChips");

    if (!token) {
        lock?.classList.remove("hidden");
        if (input) input.disabled = true;
        if (send) send.disabled = true;
        if (chips) chips.querySelectorAll("button").forEach((b) => (b.disabled = true));
        setChatStatus("Login required", "muted");
        return;
    }

    lock?.classList.add("hidden");
    if (input) input.disabled = false;
    if (send) send.disabled = false;
    if (chips) chips.querySelectorAll("button").forEach((b) => (b.disabled = false));
    setChatStatus("Ready", "ok");
};

const refreshUI = async () => {
    if (!token) {
        user = null;
        show("authView");
        hide("donorView");
        hide("hospitalView");
        byId("logoutBtn").classList.add("hidden");
        byId("userBadge").textContent = "";
        updateChatAvailability();
        return;
    }

    const profile = await api("/api/auth/me");
    user = profile.user;
    byId("userBadge").textContent = `${user.name} • ${user.role} • ${user.city}`;
    byId("logoutBtn").classList.remove("hidden");
    hide("authView");

    if (user.role === "donor") {
        show("donorView");
        hide("hospitalView");
        await loadDonorData();
    } else {
        show("hospitalView");
        hide("donorView");
        await loadHospitalData();
    }

    updateChatAvailability();
};

const loadDonorData = async () => {
    const nearby = await api("/api/requests/donor/nearby");
    const donorBox = byId("donorRequests");
    clearEl(donorBox);

    nearby.requests.forEach((request) => {
        const card = document.createElement("div");
        card.className = "row";

        const title = document.createElement("div");
        title.className = "row-title";
        title.textContent = request.hospital?.hospitalName || "Hospital";

        const meta = document.createElement("div");
        meta.className = "row-meta";
        const bg = document.createElement("span");
        bg.className = "blood";
        bg.textContent = request.neededBloodGroup || "-";
        meta.appendChild(bg);
        meta.appendChild(
            document.createTextNode(
                ` • ${request.city || "-"} • urgency: ${request.urgency || "-"}${
                    request.distanceKm ? ` • ~${request.distanceKm} km` : ""
                }`
            )
        );

        const actions = document.createElement("div");
        actions.className = "row-actions";
        const button = document.createElement("button");
        button.type = "button";
        button.className = "btn primary";
        button.textContent = "Accept request";
        button.addEventListener("click", async () => {
            await api(`/api/requests/donor/accept/${request._id}`, { method: "POST" });
            await loadDonorData();
        });
        actions.appendChild(button);

        card.appendChild(title);
        card.appendChild(meta);
        card.appendChild(actions);
        donorBox.appendChild(card);
    });

    const history = await api("/api/requests/donor/history");
    const histBox = byId("donorHistory");
    clearEl(histBox);
    history.history.forEach((entry) => {
        const item = document.createElement("div");
        item.className = "row";

        const title = document.createElement("div");
        title.className = "row-title";
        title.textContent = entry.hospital?.hospitalName || "Hospital";

        const meta = document.createElement("div");
        meta.className = "row-meta";
        meta.textContent = `${entry.neededBloodGroup} • ${entry.city} • status: ${entry.status}`;

        item.appendChild(title);
        item.appendChild(meta);
        histBox.appendChild(item);
    });
};

const loadHospitalData = async () => {
    const requests = await api("/api/requests/hospital/list");
    const reqBox = byId("hospitalRequests");
    clearEl(reqBox);

    requests.requests.forEach((request) => {
        const block = document.createElement("div");
        block.className = "row";

        const title = document.createElement("div");
        title.className = "row-title";
        title.textContent = `${request.neededBloodGroup} • ${request.city}`;

        const meta = document.createElement("div");
        meta.className = "row-meta";
        meta.textContent = `Status: ${request.status} • units: ${request.unitsNeeded} • urgency: ${request.urgency}`;

        block.appendChild(title);
        block.appendChild(meta);

        request.candidates.forEach((candidate) => {
            const row = document.createElement("div");
            row.className = "candidate";

            const label = document.createElement("div");
            label.style.flex = "1";
            label.style.minWidth = "220px";
            label.textContent = `${candidate.donor?.name || "Donor"} • ${candidate.donor?.bloodGroup || "-"} • ${
                candidate.status
            }`;

            const actions = document.createElement("div");
            actions.className = "row-actions";
            actions.style.marginTop = "0";

            if (candidate.status === "pending") {
                const approve = document.createElement("button");
                approve.type = "button";
                approve.className = "btn primary";
                approve.textContent = "Approve";
                approve.addEventListener("click", async () => {
                    await api(`/api/requests/hospital/approve/${request._id}`, {
                        method: "POST",
                        body: JSON.stringify({ donorId: candidate.donor._id, decision: "approve" })
                    });
                    await loadHospitalData();
                });
                actions.appendChild(approve);
            }

            if (candidate.status === "approved") {
                const done = document.createElement("button");
                done.type = "button";
                done.className = "btn ghost";
                done.textContent = "Mark done";
                done.addEventListener("click", async () => {
                    await api(`/api/requests/hospital/complete/${request._id}`, {
                        method: "POST",
                        body: JSON.stringify({ donorId: candidate.donor._id })
                    });
                    await loadHospitalData();
                });
                actions.appendChild(done);
            }

            row.appendChild(label);
            row.appendChild(actions);
            block.appendChild(row);
        });

        reqBox.appendChild(block);
    });

    const history = await api("/api/requests/hospital/history");
    const histBox = byId("hospitalHistory");
    clearEl(histBox);
    history.donors.forEach((entry) => {
        const item = document.createElement("div");
        item.className = "row";

        const title = document.createElement("div");
        title.className = "row-title";
        title.textContent = entry.donor.name;

        const meta = document.createElement("div");
        meta.className = "row-meta";
        meta.textContent = `${entry.donor.bloodGroup} • ${entry.donor.city} • contact: ${entry.donor.contact || "-"} • completed`;

        item.appendChild(title);
        item.appendChild(meta);
        histBox.appendChild(item);
    });
};

byId("registerForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const role = byId("regRole").value;
    const payload = {
        role,
        name: byId("regName").value.trim(),
        email: byId("regEmail").value.trim(),
        password: byId("regPassword").value,
        city: byId("regCity").value,
        contact: byId("regContact").value.trim() || undefined,
        bloodGroup: byId("regBloodGroup").value.trim() || undefined,
        age: byId("regAge").value ? Number(byId("regAge").value) : undefined,
        hospitalName: byId("regHospitalName").value.trim() || undefined,
        location:
            byId("regLat").value && byId("regLng").value
                ? { lat: Number(byId("regLat").value), lng: Number(byId("regLng").value) }
                : undefined
    };

    const data = await api("/api/auth/register", { method: "POST", body: JSON.stringify(payload) });
    token = data.token;
    localStorage.setItem("token", token);
    await refreshUI();
});

byId("loginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = await api("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({
            email: byId("loginEmail").value.trim(),
            password: byId("loginPassword").value
        })
    });
    token = data.token;
    localStorage.setItem("token", token);
    await refreshUI();
});

byId("createRequestForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    await api("/api/requests/hospital/create", {
        method: "POST",
        body: JSON.stringify({
            neededBloodGroup: byId("neededBloodGroup").value.trim(),
            unitsNeeded: Number(byId("unitsNeeded").value),
            urgency: byId("urgency").value,
            note: byId("requestNote").value.trim()
        })
    });
    await loadHospitalData();
});

byId("logoutBtn").addEventListener("click", () => {
    token = "";
    user = null;
    localStorage.removeItem("token");
    conversationId = null;
    seedWelcomeChat();
    refreshUI();
});

const sendChatMessage = async () => {
    if (!token) return;
    const input = byId("chatInput");
    const message = input.value.trim();
    if (!message) return;

    appendChatMessage("user", message);
    input.value = "";
    setChatStatus("Thinking…", "muted");

    try {
        const data = await api("/api/chat/send", {
            method: "POST",
            body: JSON.stringify({ message, conversationId })
        });
        conversationId = data.conversationId;
        appendChatMessage("bot", data.message);
        setChatStatus("Ready", "ok");
    } catch (error) {
        appendChatMessage("system", error.message || "Chat failed");
        setChatStatus("Error", "muted");
    }
};

byId("chatSend").addEventListener("click", sendChatMessage);
byId("chatInput")?.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
        event.preventDefault();
        sendChatMessage();
    }
});

byId("publicSearchForm")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const blood = byId("publicBlood").value;
    const city = byId("publicCity").value;
    try {
        await runPublicSearch(blood, city);
    } catch (error) {
        const donorBox = byId("publicDonors");
        const hospitalBox = byId("publicHospitals");
        clearEl(donorBox);
        clearEl(hospitalBox);
        const msg = document.createElement("div");
        msg.className = "muted";
        msg.textContent = error.message || "Search failed";
        donorBox.appendChild(msg);
    }
});

populateCitySelect(byId("publicCity"));
populateCitySelect(byId("regCity"));
wireQuickChips();
seedWelcomeChat();
updateChatAvailability();

refreshUI().catch(() => {
    token = "";
    localStorage.removeItem("token");
    refreshUI();
});

