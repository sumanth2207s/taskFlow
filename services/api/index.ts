import express from 'express';
import { prisma } from '../../system/db/prismaConnection'
import fs from 'fs';
import path from 'path';


const app = express();

app.use(express.json());

const filePath = path.join(__dirname, '../../system/store/task.json');

function writeTasksToFile (task: any, key: any){
    try {
        let tasks = [];
        let updatedTasks;
        if (fs.existsSync(filePath)) {
            const fileContent = fs.readFileSync(filePath, 'utf-8');
            tasks = fileContent ? JSON.parse(fileContent) : [];
        }
        if (key === 'update') {
            const update = tasks.find((o: any)=>o.uuid === task.uuid)
            update.status = task.status
            console.log(tasks)
            fs.writeFileSync(filePath, JSON.stringify(tasks, null, 2), 'utf-8');
        } else if(key === 'create') {
            tasks.push(task);
            fs.writeFileSync(filePath, JSON.stringify(tasks, null, 2), 'utf-8');
        } else if (key === 'delete'){
            console.log(tasks.filter((o: any) => o.uuid !== task.uuid))
            updatedTasks = tasks.filter((o: any) => o.uuid !== task.uuid);
            fs.writeFileSync(filePath, JSON.stringify(updatedTasks, null, 2), 'utf-8');
        }
    } catch (error) {
        console.error('Error writing tasks file:', error);
    }
};

app.post('/tasks', async (req, res)=>{
    let task: any
    await prisma.$transaction(async (prisma)=> {  
        task = await prisma.task.create({
            data: {
                title: req.body.title,
                description: req.body.description,
                status: req.body.status
            }
        })
    })

    writeTasksToFile(task, 'create');

    res.status(201).json({
        message: "Task created successfully",
        task: {
            id: task.uuid,
            title: task.title,
            desciption: task.desciption,
            status: task.status
        }
    })
})

app.get('/tasks', async(_req,res)=>{
    const taskList = await prisma.task.findMany()
    res.status(200).json(taskList)
})

app.put('/tasks/:id', async(req,res)=>{
    const taskUuid = req.params.id
    const status = req.body.status

    const checkTask = await prisma.task.findFirst({
        where: {
            uuid: taskUuid
        }
    })

    if (checkTask) {
        const task = await prisma.task.update({
            where: {
                uuid: taskUuid
            },
            data: {
                status:  status
            }
        })

        writeTasksToFile(task, 'update');
    
        res.status(200).json({
            message: "Task updated successfully",
            task: {
                id: task.uuid,
                title: task.title,
                desciption: task.description,
                status: task.status
            }
        })   
    }else {
        res.status(404).json({
            error: "Task not found"
        })  
    }
})

app.delete('/tasks/:id', async(req,res)=>{
    const taskUuid = req.params.id
    const checkTask = await prisma.task.findFirst({
        where: {
            uuid: taskUuid
        }
    })

    if (checkTask) {
        const task = await prisma.task.delete({
            where: {
                uuid: taskUuid
            }
        })
        writeTasksToFile(task, 'delete');
        res.status(200).json({
            message: "Task deleted successfully"
        })
    }else{
        res.status(404).json({
            error: "Task not found"
        })
    }
})

app.get('/tasks/status/:status', async(req,res)=>{
    const filter = req.params.status

    if (filter === 'pending') {
        const checkTask = await prisma.task.findMany({
            where: {
                status:'pending'
            }
        })
        res.status(200).json(checkTask)
    } else if (filter === 'completed') {
        const checkTask = await prisma.task.findMany({
            where: {
                status:'completed'
            }
        })
        res.status(200).json(checkTask)
    } else {
        res.status(404).json({
            error: 'Invalid status filter'
        })
    }
})


export default app;
