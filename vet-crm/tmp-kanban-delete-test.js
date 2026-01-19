(async()=>{
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();

  const userId = "00000000-0000-0000-0000-000000000001";
  await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: { id: userId, email: "kanban-test@local.dev", name: "Kanban Test", role: "ADMIN" },
  });

  const board = await prisma.board.create({
    data: { name: "Kanban Test Board " + Date.now(), type: "APPOINTMENT", userId },
  });
  const col = await prisma.kanbanColumn.create({
    data: { name: "Col Test", position: 0, color: "#000", boardId: board.id },
  });
  await prisma.kanbanCard.create({
    data: { title: "Card Test", position: 0, columnId: col.id },
  });

  const res = await fetch("http://localhost:3000/api/columns/" + col.id, {
    method: "DELETE",
    headers: { "x-user-id": userId },
  });
  const body = await res.text();

  console.log(JSON.stringify({ userId, boardId: board.id, columnId: col.id, deleteStatus: res.status, deleteBody: body }, null, 2));
  await prisma.$disconnect();
})().catch((e)=>{ console.error(e); process.exit(1); });
