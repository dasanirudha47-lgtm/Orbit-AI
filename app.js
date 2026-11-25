const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
const STORE = "orbitAI_workspace_v1";
const defaultData = {tasks:[],customers:[],notes:[],workspace:"My workspace"};
let data = loadData();
let modalMode = "task";
let editingId = null;
let toastTimer;

function loadData(){
  try { return {...defaultData,...JSON.parse(localStorage.getItem(STORE) || "{}")}; }
  catch { return {...defaultData}; }
}
function saveData(){ localStorage.setItem(STORE, JSON.stringify(data)); renderAll(); }
function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,7); }
function escapeHTML(value=""){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function toast(message){const el=$("#toast");el.textContent=message;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),2600);}
function niceDate(date){if(!date)return "No due date";const d=new Date(date+"T00:00:00");return d.toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"});}
function todayISO(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;}
function navigate(page){$$(".page").forEach(p=>p.classList.toggle("active",p.id===`page-${page}`));$$(".nav-item[data-page]").forEach(b=>b.classList.toggle("active",b.dataset.page===page));$("#pageCrumb").textContent=page.charAt(0).toUpperCase()+page.slice(1);$("#sidebar").classList.remove("open");window.scrollTo({top:0,behavior:"smooth"});}
$$("[data-page]").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.page)));
$$("[data-go]").forEach(b=>b.addEventListener("click",()=>navigate(b.dataset.go)));
$("#mobileMenu").addEventListener("click",()=>$("#sidebar").classList.toggle("open"));
$("#todayLabel").textContent=new Date().toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"});

function renderAll(){renderOverview();renderTasks();renderCustomers();renderNotes();$("#workspaceName").value=data.workspace||"My workspace";$$(".profile strong").forEach(el=>el.textContent=data.workspace||"My workspace");}
function renderOverview(){
 const open=data.tasks.filter(t=>!t.done),done=data.tasks.filter(t=>t.done),high=open.filter(t=>t.priority==="High");
 $("#statActive").textContent=open.length;$("#statDone").textContent=done.length;$("#statCustomers").textContent=data.customers.length;$("#statPriority").textContent=high.length;
 $("#statTaskFoot").textContent=data.tasks.length?`${data.tasks.length} total task${data.tasks.length===1?"":"s"}`:"No tasks yet";
 $("#taskNavCount").textContent=open.length;
 const total=data.tasks.length,percent=total?Math.round(done.length/total*100):0;
 $("#progressFill").style.width=percent+"%";$("#progressLabel").textContent=percent+"% complete";
 const list=$("#overviewTasks");
 const upcoming=[...open].sort((a,b)=>(a.due||"9999").localeCompare(b.due||"9999")).slice(0,4);
 list.innerHTML=upcoming.length?upcoming.map(t=>`<div class="task-row-mini"><button class="check-circle" data-toggle-task="${t.id}" aria-label="Complete task"></button><div class="task-mini-text"><strong>${escapeHTML(t.title)}</strong><small><i class="priority-dot priority-${t.priority.toLowerCase()}"></i>${t.priority} priority · ${niceDate(t.due)}</small></div></div>`).join(""):`<div class="empty-state"><div class="empty-icon">✧</div><h3>Clear runway</h3><p>Add a task and Orbit will help you keep track.</p></div>`;
 $$("[data-toggle-task]").forEach(b=>b.addEventListener("click",()=>toggleTask(b.dataset.toggleTask)));
}
function renderTasks(){
 const q=($("#taskSearch")?.value||"").toLowerCase(),filter=$("#taskFilter")?.value||"all";
 let tasks=data.tasks.filter(t=>t.title.toLowerCase().includes(q)||t.description.toLowerCase().includes(q));
 if(filter==="open")tasks=tasks.filter(t=>!t.done);if(filter==="done")tasks=tasks.filter(t=>t.done);if(filter==="high")tasks=tasks.filter(t=>t.priority==="High"&&!t.done);
 tasks.sort((a,b)=>(a.done-b.done)||(a.due||"9999").localeCompare(b.due||"9999"));
 $("#taskRows").innerHTML=tasks.map(t=>`<div class="task-table-row ${t.done?"completed":""}"><div class="task-name"><button class="check-circle ${t.done?"checked":""}" data-toggle-task="${t.id}" aria-label="Toggle task">${t.done?"✓":""}</button><span>${escapeHTML(t.title)}</span></div><span><i class="priority-dot priority-${t.priority.toLowerCase()}"></i>${t.priority}</span><span>${niceDate(t.due)}</span><span class="status-cell"><span class="pill">${t.done?"Completed":"To do"}</span></span><button class="row-menu" data-task-menu="${t.id}" aria-label="Task actions">⋯</button></div>`).join("");
 $("#taskEmpty").style.display=tasks.length?"none":"block";
 $$("[data-toggle-task]").forEach(b=>b.addEventListener("click",()=>toggleTask(b.dataset.toggleTask)));
 $$("[data-task-menu]").forEach(b=>b.addEventListener("click",()=>{const t=data.tasks.find(x=>x.id===b.dataset.taskMenu);if(!t)return;if(confirm(`Delete "${t.title}"?`)){data.tasks=data.tasks.filter(x=>x.id!==t.id);saveData();toast("Task deleted");}}));
}
function toggleTask(id){const t=data.tasks.find(x=>x.id===id);if(t){t.done=!t.done;saveData();toast(t.done?"Task completed":"Task reopened");}}
$("#taskSearch").addEventListener("input",renderTasks);$("#taskFilter").addEventListener("change",renderTasks);

function renderCustomers(){
 const q=($("#customerSearch")?.value||"").toLowerCase();
 const list=data.customers.filter(c=>(c.name+" "+c.email+" "+c.company).toLowerCase().includes(q));
 $("#customerCount").textContent=`${list.length} contact${list.length===1?"":"s"}`;
 $("#customerGrid").innerHTML=list.map(c=>`<article class="customer-card"><div class="customer-top"><div class="customer-avatar">${escapeHTML(c.name.charAt(0).toUpperCase())}</div><div><h3>${escapeHTML(c.name)}</h3><small>${escapeHTML(c.company||"Individual")}</small></div></div><div class="customer-info">${c.email?`✉ ${escapeHTML(c.email)}<br>`:""}${c.phone?`☎ ${escapeHTML(c.phone)}`:""}${c.notes?`<br>${escapeHTML(c.notes)}`:""}</div><div class="card-actions"><button class="mini-action" data-edit-customer="${c.id}">Edit</button><button class="mini-action" data-delete-customer="${c.id}">Delete</button></div></article>`).join("");
 $("#customerEmpty").style.display=list.length?"none":"block";
 $$("[data-edit-customer]").forEach(b=>b.addEventListener("click",()=>openCustomerModal(b.dataset.editCustomer)));
 $$("[data-delete-customer]").forEach(b=>b.addEventListener("click",()=>{if(confirm("Delete this customer?")){data.customers=data.customers.filter(c=>c.id!==b.dataset.deleteCustomer);saveData();toast("Customer deleted");}}));
}
$("#customerSearch").addEventListener("input",renderCustomers);

function renderNotes(){
 $("#notesGrid").innerHTML=data.notes.map(n=>`<article class="note-card"><div class="note-date">${new Date(n.updated).toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"})}</div><h3>${escapeHTML(n.title)}</h3><p>${escapeHTML(n.body)}</p><div class="note-actions"><button data-edit-note="${n.id}">Edit note ↗</button><button data-delete-note="${n.id}">Delete</button></div></article>`).join("");
 $("#notesEmpty").style.display=data.notes.length?"none":"block";
 $$("[data-edit-note]").forEach(b=>b.addEventListener("click",()=>openNoteModal(b.dataset.editNote)));
 $$("[data-delete-note]").forEach(b=>b.addEventListener("click",()=>{if(confirm("Delete this note?")){data.notes=data.notes.filter(n=>n.id!==b.dataset.deleteNote);saveData();toast("Note deleted");}}));
}

function field(label,name,type="text",value="",placeholder=""){
 const safe=escapeHTML(value);
 if(type==="textarea")return `<div class="field"><label for="${name}">${label}</label><textarea id="${name}" name="${name}" placeholder="${placeholder}">${safe}</textarea></div>`;
 if(type==="priority")return `<div class="field"><label for="${name}">${label}</label><select id="${name}" name="${name}"><option ${value==="Low"?"selected":""}>Low</option><option ${value==="Medium"||!value?"selected":""}>Medium</option><option ${value==="High"?"selected":""}>High</option></select></div>`;
 return `<div class="field"><label for="${name}">${label}</label><input id="${name}" name="${name}" type="${type}" value="${safe}" placeholder="${placeholder}"></div>`;
}
function showModal(title,fields,mode,id=null,submit="Save"){
 modalMode=mode;editingId=id;$("#modalTitle").textContent=title;$("#modalFields").innerHTML=fields;$("#modalSubmit").textContent=submit;$("#modalBackdrop").classList.add("open");
 setTimeout(()=>$("#modalFields input")?.focus(),50);
}
function closeModal(){$("#modalBackdrop").classList.remove("open");$("#modalForm").reset();editingId=null;}
$("#modalClose").addEventListener("click",closeModal);$("#modalCancel").addEventListener("click",closeModal);
$("#modalBackdrop").addEventListener("click",e=>{if(e.target===$("#modalBackdrop"))closeModal();});
function openTaskModal(id=null){
 const t=id?data.tasks.find(x=>x.id===id):{};
 showModal(id?"Edit task":"Create a task",field("Task name","title","text",t?.title||"","What needs to get done?")+field("Description","description","textarea",t?.description||"","Add some detail (optional)")+field("Priority","priority","priority",t?.priority||"Medium")+field("Due date","due","date",t?.due||""),"task",id);
}
function openCustomerModal(id=null){
 const c=id?data.customers.find(x=>x.id===id):{};
 showModal(id?"Edit customer":"Add a customer",field("Full name","name","text",c?.name||"","Customer name")+field("Company","company","text",c?.company||"","Business or organisation")+field("Email","email","email",c?.email||"","name@example.com")+field("Phone","phone","tel",c?.phone||"","Phone number")+field("Notes","notes","textarea",c?.notes||"","Useful context (optional)"),"customer",id);
}
function openNoteModal(id=null){
 const n=id?data.notes.find(x=>x.id===id):{};
 showModal(id?"Edit note":"Create a note",field("Title","title","text",n?.title||"","Give your note a title")+field("Your note","body","textarea",n?.body||"","Write your thoughts here..."),"note",id);
}
$("#modalForm").addEventListener("submit",e=>{
 e.preventDefault();const fd=new FormData(e.currentTarget),v=Object.fromEntries(fd.entries());
 if(modalMode==="task"){if(!v.title.trim()){toast("Give your task a name first");return;}if(editingId){Object.assign(data.tasks.find(t=>t.id===editingId),v);}else data.tasks.push({id:uid(),...v,done:false,created:Date.now()});}
 if(modalMode==="customer"){if(!v.name.trim()){toast("Add a customer name first");return;}if(editingId)Object.assign(data.customers.find(c=>c.id===editingId),v);else data.customers.push({id:uid(),...v});}
 if(modalMode==="note"){if(!v.title.trim()){toast("Give your note a title first");return;}if(editingId)Object.assign(data.notes.find(n=>n.id===editingId),{...v,updated:Date.now()});else data.notes.unshift({id:uid(),...v,updated:Date.now()});}
 const label=modalMode;closeModal();saveData();toast(`${label[0].toUpperCase()+label.slice(1)} saved`);
});
$("#addTaskBtn").addEventListener("click",()=>openTaskModal());$("#emptyAddTask").addEventListener("click",()=>openTaskModal());$("#overviewAddTask").addEventListener("click",()=>openTaskModal());$("#quickAddBtn").addEventListener("click",()=>openTaskModal());
$("#addCustomerBtn").addEventListener("click",()=>openCustomerModal());$("#emptyAddCustomer").addEventListener("click",()=>openCustomerModal());
$("#addNoteBtn").addEventListener("click",()=>openNoteModal());$("#emptyAddNote").addEventListener("click",()=>openNoteModal());

/* Local demo assistant: useful structured guidance, not a connected AI model. */
function localOrbitReply(question){
 const q=question.toLowerCase();
 if(/plan.*week|week.*plan|prioriti|organis|overwhelmed/.test(q)){
  const open=data.tasks.filter(t=>!t.done);
  const high=open.filter(t=>t.priority==="High");
  return `<strong>Let's make your workload manageable.</strong><p>You currently have ${open.length} open task${open.length===1?"":"s"}${high.length?`, including ${high.length} high-priority item${high.length===1?"":"s"}`:""}. Start with the most important deadline, then group similar small tasks together. Leave a little buffer for unexpected work.</p><p><b>Suggested next step:</b> Add your deadlines in the Tasks section, mark urgent work as High priority, and tackle one meaningful task at a time.</p>`;
 }
 if(/market|promot|social media|advertis/.test(q)){
  return `<strong>Five practical marketing ideas</strong><p>1. Share a useful weekly tip related to your product.<br>2. Ask happy customers for a short review.<br>3. Partner with a complementary local business.<br>4. Create a simple referral offer.<br>5. Show behind-the-scenes content that explains how you work.</p><p>Pick one idea, test it for two weeks and track enquiries rather than just likes.</p>`;
 }
 if(/business plan|start.*business|business idea/.test(q)){
  return `<strong>A simple business plan outline</strong><p><b>1. Customer:</b> Who has the problem you want to solve?<br><b>2. Problem:</b> What are they struggling with?<br><b>3. Offer:</b> What product or service will you provide?<br><b>4. Difference:</b> Why would someone choose you?<br><b>5. Costs:</b> What will it cost to start and operate?<br><b>6. First customers:</b> How will you reach your first five customers?</p><p>Keep the first version short. Validate demand before spending heavily.</p>`;
 }
 if(/customer|follow.?up|email|message|reply/.test(q)){
  return `<strong>Customer follow-up draft</strong><p>Hi [Name],<br><br>Thanks for taking the time to connect with us. I wanted to follow up and see if you had any questions or if there is anything else I can help with. Happy to discuss the next steps whenever suits you.<br><br>Kind regards,<br>[Your name]</p><p>Replace the placeholders and adjust the tone to suit your relationship with the customer.</p>`;
 }
 if(/sales|revenue|profit|cash flow|cashflow/.test(q)){
  return `<strong>Start with the numbers that matter.</strong><p>Track revenue, direct costs, operating expenses and cash received. Revenue is not the same as profit, and profit is not the same as cash in the bank. Review these figures regularly and compare them with your budget.</p><p>If you share example figures (without private account details), I can help you organise a basic calculation.</p>`;
 }
 if(/hello|hi\b|hey\b|morning/.test(q)){
  return `<strong>Hey! What are we working on?</strong><p>I can help you brainstorm, structure a plan, draft a message, think through marketing or organise your tasks. Tell me a little about the business and the outcome you're aiming for.</p>`;
 }
 return `<strong>Let's break that down.</strong><p>Here's a useful way to approach it:</p><p>1. Define the outcome you want.<br>2. Identify the biggest obstacle.<br>3. List two or three possible approaches.<br>4. Choose a small next step you can test.</p><p>For a more specific answer, tell me what kind of business you're working on, who your customers are and what you're trying to achieve.</p>`;
}
function addMessage(text,isUser=false,html=false){
 const wrap=document.createElement("div");wrap.className=`message ${isUser?"user-message":"assistant-message"}`;
 const avatar=document.createElement("div");avatar.className="message-avatar";avatar.textContent=isUser?"O":"✳";
 const bubble=document.createElement("div");bubble.className="bubble";
 if(html)bubble.innerHTML=text;else bubble.textContent=text;
 wrap.append(avatar,bubble);$("#chatMessages").append(wrap);$("#chatMessages").scrollTop=$("#chatMessages").scrollHeight;
}

async function sendChat(text) {
    const question = text.trim();
    if (!question) return;

    addMessage(question, true);
    $("#chatInput").value = "";

    try {
        const response = await fetch("http://127.0.0.1:5002/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: question
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Something went wrong.");
        }

        addMessage(data.reply, false, true);

    } catch (error) {
        console.error(error);
        addMessage(
            "I couldn't connect to Orbit's AI server. Please check that it is running.",
            false,
            true
        );
    }
}
$("#chatForm").addEventListener("submit",e=>{e.preventDefault();sendChat($("#chatInput").value);});
$$(".suggestion").forEach(b=>b.addEventListener("click",()=>sendChat(b.textContent)));
$$(".prompt-option").forEach(b=>b.addEventListener("click",()=>sendChat(b.dataset.prompt)));
$("#clearChat").addEventListener("click",()=>{$("#chatMessages").innerHTML="";addMessage("Chat cleared. What would you like to work on next?");});
function exportData(){
 const blob=new Blob([JSON.stringify(data,null,2)],{type:"application/json"}),url=URL.createObjectURL(blob),a=document.createElement("a");
 a.href=url;a.download="orbit-ai-backup.json";a.click();URL.revokeObjectURL(url);toast("Workspace backup exported");
}
$("#exportBtn").addEventListener("click",exportData);$("#settingsExport").addEventListener("click",exportData);
$("#workspaceForm").addEventListener("submit",e=>{e.preventDefault();data.workspace=$("#workspaceName").value.trim()||"My workspace";saveData();toast("Workspace name saved");});
$("#resetData").addEventListener("click",()=>{if(confirm("This permanently clears all Orbit tasks, customers and notes saved in this browser. Export a backup first if you need one. Continue?")){data={...defaultData};saveData();$("#chatMessages").innerHTML="";addMessage("Your workspace has been reset. Let's start fresh.");toast("Workspace reset");}});
renderAll();
