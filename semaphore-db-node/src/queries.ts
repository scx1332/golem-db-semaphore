export interface TaskInfo {
  taskId: string;
  description: string;
  status: "waiting" | "running";
  progress: number; // percentage from 0 to 100
  startTime: string; // ISO string
  message: string; // additional info about the task
}


interface ApplicationState {
  numberOfTasks: number;
  tasks: TaskInfo[];
}

export const appState: ApplicationState = {
  numberOfTasks: 0,
  tasks: [],
};


class Operations {
  public getCurrentTaskList(): TaskInfo[] {
    const tasks: TaskInfo[] = [];
    for (const task of appState.tasks) {
      tasks.push(structuredClone(task));
    }
    return tasks;
  }

  public appendTask(taskInfo: TaskInfo): TaskInfo {
    //check if task exist
    if (appState.tasks.filter((task) => task.taskId === taskInfo.taskId).length > 0) {
      throw new Error(`Task ${taskInfo.taskId} already exists`);
    }
    appState.tasks.push(taskInfo);
    return structuredClone(taskInfo);
  }

  public updateTask(taskInfo: TaskInfo) {
    //check if task exist
    const taskIndex = appState.tasks.findIndex((task) => task.taskId === taskInfo.taskId);

    if (taskIndex == -1) {
      throw new Error(`Task ${taskInfo.taskId} not exists`);
    }
    appState.tasks[taskIndex] = taskInfo;
  }


  public removeTask(taskId: string): boolean {
    //check if task exits
    const noTasks = appState.tasks.filter((task) => task.taskId === taskId).length;

    if (noTasks > 1) {
      throw new Error(`Task ${taskId} has duplicate task ids`);
    } else if (noTasks > 0) {
      appState.tasks = appState.tasks.filter((task) => task.taskId === taskId);
      return true;
    }
    return false;
  }

}

export const operations = new Operations();
