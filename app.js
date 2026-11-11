(() => {
  const seed = window.SEMINAR_SEED;
  if (!seed) return;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const state = { query: "", lastFocused: null };
  const dialog = $("#resource-dialog");

  const escapeHtml = (value = "") => String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

  const flatResources = () => seed.learningRooms.flatMap((room) => room.resources.map((resource) => ({ ...resource, roomTitle: room.title })));
  const studentsById = Object.fromEntries(seed.students.map((student) => [student.id, student]));
  const statusLabel = (status) => ({ verified: "파일 확인됨", needs_review: "확인 필요", missing: "자료 확인 중", restricted: "권한 필요", conversion_failed: "변환 확인 필요" }[status] || "상태 확인 중");
  const statusClass = (status) => status === "missing" ? "missing" : status === "needs_review" ? "review" : "";
  const symbolFor = (kind) => ({ video: "▶", image: "▧", pdf: "PDF" }[kind] || "•");
  const searchable = (value) => String(value || "").toLocaleLowerCase("ko-KR");
  const matches = (parts) => {
    if (!state.query) return true;
    const haystack = searchable(parts.filter(Boolean).join(" "));
    return haystack.includes(searchable(state.query));
  };

  const renderStaticText = () => {
    $("#greeting-copy").innerHTML = `${escapeHtml(seed.greeting)}<cite>— 담당교수 김승환</cite>`;
    $("#agenda-list").innerHTML = seed.agenda.map((item) => `<li><span>${escapeHtml(item.number)}</span><div><strong>${escapeHtml(item.title)}</strong><small>${escapeHtml(item.detail)}</small></div></li>`).join("");
  };

  const resourceAction = (resource) => {
    if (resource.kind === "video" && resource.originalUrl) {
      return `<button class="text-button" type="button" data-resource-id="${escapeHtml(resource.id)}">YouTube 열기 ↗</button>`;
    }
    if (resource.originalUrl) {
      return `<a class="text-button" href="${escapeHtml(resource.originalUrl)}" target="_blank" rel="noopener noreferrer">YouTube 열기 ↗</a>`;
    }
    if (resource.viewUrl && resource.status === "verified") {
      return `<button class="text-button" type="button" data-resource-id="${escapeHtml(resource.id)}">자료 열기</button>`;
    }
    return `<button class="text-button disabled" type="button" disabled>자료 확인 중</button>`;
  };

  const renderResourceCard = (resource) => {
    const isMatch = matches([resource.displayTitle, resource.originalTitle, resource.kindLabel, resource.status, resource.roomTitle]);
    return `<article class="resource-card${isMatch ? "" : " is-hidden"}" data-resource-card="${escapeHtml(resource.id)}">
      <div class="resource-card-top"><span class="resource-kind">${escapeHtml(resource.kindLabel)}</span><span class="state-pill ${statusClass(resource.status)}">${escapeHtml(statusLabel(resource.status))}</span></div>
      <div class="resource-symbol" aria-hidden="true">${escapeHtml(symbolFor(resource.kind))}</div>
      <h4>${escapeHtml(resource.displayTitle)}</h4>
      ${resource.originalTitle ? `<p class="resource-meta">원문 제목 · ${escapeHtml(resource.originalTitle)}</p>` : `<p class="resource-meta">${resource.status === "missing" ? "원본이 확인되면 열람할 수 있습니다." : "지침서에 제공된 자료입니다."}</p>`}
      <div class="resource-card-bottom"><small>${escapeHtml(resource.pages ? `${resource.pages}쪽 · ` : "")}${escapeHtml(resource.evidence || "")}</small>${resourceAction(resource)}</div>
    </article>`;
  };

  const renderLearning = () => {
    const roomMarkup = seed.learningRooms.map((room) => {
      const resources = room.resources.map(renderResourceCard).join("");
      const visible = room.resources.some((resource) => matches([resource.displayTitle, resource.originalTitle, resource.kindLabel, resource.status, room.title]));
      return `<section class="learning-room${visible ? "" : " is-hidden"}" data-learning-room="${escapeHtml(room.id)}" aria-labelledby="${escapeHtml(room.id)}-title">
        <div class="learning-room-head"><div><p class="section-kicker">${escapeHtml(room.eyebrow)}</p><h3 id="${escapeHtml(room.id)}-title">${escapeHtml(room.title)}</h3></div><p class="learning-room-intro">${escapeHtml(room.intro)}</p></div>
        <p class="question-strip">${escapeHtml(room.question)}</p>
        <div class="resource-grid">${resources}</div>
      </section>`;
    }).join("");
    $("#learning-rooms").innerHTML = roomMarkup;
  };

  const presentationMarkup = () => seed.presentationOrder.map((id, index) => {
    const student = studentsById[id];
    const report = student.presentationReport;
    const match = matches([student.name, student.presentationTitle, "연구발표", statusLabel(report.status)]);
    const action = report.status === "restricted" ? `<button class="text-button" type="button" data-protected="${escapeHtml(student.id)}" data-document-kind="발표 연구보고서">연구보고서 열기</button>` : `<button class="text-button" type="button" data-protected="${escapeHtml(student.id)}" data-document-kind="발표 연구보고서">원문 확인 중</button>`;
    return `<article class="presentation-card${match ? "" : " is-hidden"}"><span class="presentation-number">${String(index + 1).padStart(2, "0")}</span><h3>${escapeHtml(student.presentationTitle)}</h3><p>${escapeHtml(student.name)} 원우님</p>${action}</article>`;
  }).join("");

  const archiveAction = (student, kind, label, item) => {
    const reviewClass = item.status === "needs_review" ? " needs-review" : "";
    if (item.viewUrl) {
      const detail = item.status === "needs_review" ? "원문 열기 · 이름 확인 필요" : "원문 열기";
      return `<a class="archive-action${reviewClass}" href="${escapeHtml(item.viewUrl)}" target="_blank" rel="noopener noreferrer"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(detail)}</span></a>`;
    }
    const scope = kind === "교수평가서" ? "본인·교수 열람" : "수강 인증 필요";
    return `<button class="archive-action${reviewClass}" type="button" data-protected="${escapeHtml(student.id)}" data-document-kind="${escapeHtml(kind)}"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(statusLabel(item.status))} · ${escapeHtml(scope)}</span></button>`;
  };

  const renderArchive = () => {
    const cards = seed.archiveOrder.map((id, index) => {
      const student = studentsById[id];
      const match = matches([student.name, student.presentationTitle, "제출과제", "교수평가서", statusLabel(student.submission.status), statusLabel(student.review.status)]);
      return `<article class="archive-card${match ? "" : " is-hidden"}"><div class="archive-number">${String(index + 1).padStart(2, "0")}</div><div><h3>${escapeHtml(student.name)} 원우님</h3><p>발표 순서와 별도 보관</p></div><div class="archive-title">${escapeHtml(student.presentationTitle)}</div><div class="archive-actions">${archiveAction(student, "원우 제출과제", "원우 제출과제", student.submission)}${archiveAction(student, "교수평가서", "교수평가서", student.review)}</div></article>`;
    }).join("");
    $("#archive-list").innerHTML = cards;
  };

  const renderPortals = () => {
    $("#portal-grid").innerHTML = seed.researchPortals.map((portal, index) => `<article class="portal-card"><span class="portal-no">${String(index + 1).padStart(2, "0")}</span><h3>${escapeHtml(portal.name)}</h3><p>${escapeHtml(portal.purpose)}</p><a class="portal-link" href="${escapeHtml(portal.url)}" target="_blank" rel="noopener noreferrer">기관 사이트 열기 ↗</a></article>`).join("");
  };

  const updateVisibilityAndCount = () => {
    const resourceCount = $$("[data-resource-card]").filter((card) => !card.classList.contains("is-hidden")).length;
    const presentationCount = $$(".presentation-card").filter((card) => !card.classList.contains("is-hidden")).length;
    const archiveCount = $$(".archive-card").filter((card) => !card.classList.contains("is-hidden")).length;
    const total = resourceCount + presentationCount + archiveCount;
    $("#search-result-count").textContent = state.query ? `검색 결과 ${total}건 · 자료 ${resourceCount}건, 발표 ${presentationCount}건, 아카이브 ${archiveCount}건` : `전체 자료 ${resourceCount}건 · 발표 ${presentationCount}건 · 아카이브 ${archiveCount}건`;
    $("#learning-empty").hidden = resourceCount > 0;
    $("#presentation-empty").hidden = presentationCount > 0;
    $("#archive-empty").hidden = archiveCount > 0;
  };

  const renderDynamic = () => {
    renderLearning();
    $("#presentation-grid").innerHTML = presentationMarkup();
    renderArchive();
    updateVisibilityAndCount();
  };

  const showDialog = (title, body) => {
    state.lastFocused = document.activeElement;
    $("#dialog-title").textContent = title;
    $("#dialog-body").innerHTML = body;
    dialog.showModal();
    $(".modal-close").focus();
  };

  const closeDialog = () => {
    if (!dialog.open) return;
    dialog.close();
    if (state.lastFocused && typeof state.lastFocused.focus === "function") state.lastFocused.focus();
  };

  const findResource = (id) => flatResources().find((resource) => resource.id === id);
  const youtubeEmbedUrl = (url) => {
    try {
      const parsed = new URL(url);
      const videoId = parsed.searchParams.get("v") || parsed.pathname.split("/").filter(Boolean).pop();
      return videoId ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(videoId)}?rel=0&modestbranding=1` : "";
    } catch {
      return "";
    }
  };

  const openResource = (resource) => {
    if (!resource) return;
    if (resource.kind === "video") {
      const embedUrl = youtubeEmbedUrl(resource.originalUrl || "");
      if (!embedUrl) return;
      showDialog(resource.displayTitle, `<div class="modal-meta"><span><strong>자료 종류</strong> ${escapeHtml(resource.kindLabel)}</span><span>${escapeHtml(resource.evidence)}</span></div><div class="modal-video"><iframe src="${escapeHtml(embedUrl)}" title="${escapeHtml(resource.displayTitle)}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div><div class="modal-actions"><a class="text-button" href="${escapeHtml(resource.originalUrl)}" target="_blank" rel="noopener noreferrer">YouTube 새 창에서 보기 ↗</a></div>`);
      return;
    }
    if (resource.kind === "image") {
      showDialog(resource.displayTitle, `<div class="modal-meta"><span><strong>자료 종류</strong> ${escapeHtml(resource.kindLabel)}</span><span><strong>상태</strong> ${escapeHtml(statusLabel(resource.status))}</span><span>${escapeHtml(resource.evidence)}</span></div><img class="modal-image" src="${escapeHtml(resource.viewUrl)}" alt="${escapeHtml(resource.displayTitle)}" /><div class="modal-actions"><a class="text-button" href="${escapeHtml(resource.viewUrl)}" target="_blank" rel="noopener noreferrer">원본 열기 ↗</a></div>`);
      return;
    }
    showDialog(resource.displayTitle, `<div class="modal-meta"><span><strong>자료 종류</strong> ${escapeHtml(resource.kindLabel)}</span><span><strong>페이지</strong> ${escapeHtml(resource.pages ? `${resource.pages}쪽` : "확인 중")}</span><span><strong>원문 제목</strong> ${escapeHtml(resource.originalTitle || resource.displayTitle)}</span></div><div class="modal-notice"><h3>브라우저의 PDF 화면으로 열어보세요.</h3><p>새 창에서 확대·검색이 가능한 원문 PDF를 엽니다. 이 안내 화면에서는 자료의 제목과 확인 상태만 보여줍니다.</p></div><div class="modal-actions"><a class="text-button" href="${escapeHtml(resource.viewUrl)}" target="_blank" rel="noopener noreferrer">PDF 새 창에서 열기 ↗</a></div>`);
  };

  const openProtected = (studentId, kind) => {
    const student = studentsById[studentId];
    const item = kind === "교수평가서" ? student.review : kind === "원우 제출과제" ? student.submission : student.presentationReport;
    const note = item?.note || "원문 자료는 공개 안내 화면에 포함하지 않습니다.";
    const scope = kind === "교수평가서" ? "교수 또는 해당 원우 본인" : "수강 인증을 마친 수강생과 교수";
    showDialog(`${student.name} 원우님 · ${kind}`, `<div class="modal-notice"><h3>권한 확인이 필요한 자료입니다.</h3><p>${escapeHtml(note)}</p><p style="margin-top:10px"><strong>기본 열람 범위</strong> · ${escapeHtml(scope)}</p><p style="margin-top:10px">현재 페이지는 공개 안내용이며 학교 SSO/LMS와 연결되지 않아 원문을 열지 않습니다.</p></div><div class="modal-actions"><button class="text-button" type="button" data-close-dialog>확인</button></div>`);
  };

  const updateEventStatus = () => {
    const now = new Date();
    const start = new Date(seed.event.start);
    const end = new Date(seed.event.end);
    const label = now < start ? "세미나 전" : now < end ? "세미나 진행 중" : "복습 자료실";
    $("[data-event-status]").textContent = label;
  };

  const bindMentor = () => {
    const mentor = $("#ai-mentor");
    const mentorStep = $("#ai-mentor-step");
    if (!mentor || !mentorStep) return;
    const steps = [
      { id: "greeting", label: "1. 인사말" },
      { id: "learning", label: "2. 학습자료" },
      { id: "presentations", label: "3. 연구발표" },
      { id: "archive", label: "4. 과제·평가" },
      { id: "portals", label: "5. 연구기관" },
    ];
    const updateMentor = () => {
      const marker = window.scrollY + Math.min(window.innerHeight * 0.42, 420);
      let active = steps[0];
      steps.forEach((step) => {
        const section = document.getElementById(step.id);
        if (section && section.offsetTop <= marker) active = step;
      });
      mentorStep.textContent = active.label;
      mentor.dataset.step = active.id;
    };
    window.addEventListener("scroll", updateMentor, { passive: true });
    window.addEventListener("resize", updateMentor);
    updateMentor();
  };

  const bindEvents = () => {
    const menu = $(".menu-toggle");
    const nav = $("#site-nav");
    menu.addEventListener("click", () => {
      const open = nav.classList.toggle("is-open");
      menu.setAttribute("aria-expanded", String(open));
    });
    $$(".site-nav a").forEach((link) => link.addEventListener("click", () => {
      nav.classList.remove("is-open");
      menu.setAttribute("aria-expanded", "false");
    }));
    $("#global-search").addEventListener("input", (event) => {
      state.query = event.target.value.trim();
      renderDynamic();
    });
    $("#clear-search").addEventListener("click", () => {
      state.query = "";
      $("#global-search").value = "";
      renderDynamic();
      $("#global-search").focus();
    });
    document.addEventListener("click", (event) => {
      const resourceButton = event.target.closest("[data-resource-id]");
      const protectedButton = event.target.closest("[data-protected]");
      const closeButton = event.target.closest("[data-close-dialog]");
      if (resourceButton) openResource(findResource(resourceButton.dataset.resourceId));
      if (protectedButton) openProtected(protectedButton.dataset.protected, protectedButton.dataset.documentKind);
      if (closeButton) closeDialog();
    });
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) closeDialog();
    });
    dialog.addEventListener("close", () => {
      $("#dialog-body").replaceChildren();
      if (state.lastFocused && typeof state.lastFocused.focus === "function") state.lastFocused.focus();
    });
  };

  renderStaticText();
  renderPortals();
  renderDynamic();
  updateEventStatus();
  bindMentor();
  bindEvents();
})();
