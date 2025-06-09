import { Injectable } from '@nestjs/common';
import { OpenAI } from 'openai';
import { envs } from '../config/envs';
import { ProjectsService } from '../projects/projects.service';
import { MetricsService } from '../metrics/metrics.service';
import { Project } from '../projects/entities/project.entity';

@Injectable()
export class AIAssistantService {
  private openai = new OpenAI({
    baseURL: 'https://api.deepseek.com',
    apiKey: `${envs.DEEPSEEK_API_KEY}`,
  });

  constructor(
    private readonly projectsService: ProjectsService,
    private readonly metricsService: MetricsService,
  ) {}

  async getAIResponse(query: string, userId: string) {
    const projects = await this.getUserProjects(userId);

    const userData = await this.gatherUserData(projects);

    const prompt = this.createPrompt(query, userData);

    const completion = await this.openai.chat.completions.create({
      messages: [
        {
          role: 'user',
          content:
            'Eres un asistente de productividad que ayuda a los usuarios con sus tareas, proyectos y reuniones.',
        },
        { role: 'user', content: prompt },
      ],
      model: 'deepseek-chat',
    });

    let responseText = completion.choices[0].message.content;
    if (!responseText) {
      throw new Error('No response content from AI');
    }

    return {
      response: responseText,
      type: this.determineResponseType(query),
    };
  }

  private async getUserProjects(userId: string): Promise<Project[]> {
    const projects = await this.projectsService.getAllProjects(1, 100);
    return projects.data.filter((project) =>
      project.members.some((member) => member.user_id === userId),
    );
  }

  private async gatherUserData(projects: Project[]) {
    const projectData = await Promise.all(
      projects.map(async (project) => {
        const metrics = await this.metricsService.getProjectMetrics(project.id);
        const sprintMetrics = await Promise.all(
          project.sprint.map(async (sprint) => {
            return this.metricsService.getSprintMetrics(sprint.id);
          }),
        );

        return {
          name: project.name,
          progress: this.calculateProjectProgress(metrics),
          dueDate: this.getNextSprintDueDate(project),
          priority: this.determineProjectPriority(metrics),
          metrics: {
            velocity: this.getAverageVelocity(sprintMetrics),
            completionRate: this.getAverageCompletionRate(sprintMetrics),
            burndown: this.getLatestBurndown(sprintMetrics),
          },
        };
      }),
    );

    return {
      tasks: {
        completed: this.calculateTotalCompletedTasks(projects),
        total: this.calculateTotalTasks(projects),
        recentActivity: this.getRecentActivity(projects),
      },
      projects: projectData,
      teamAvailability: await this.getTeamAvailability(projects),
      productivityStats: this.calculateProductivityStats(projectData),
    };
  }

  private calculateProjectProgress(metrics: any[]): number {
    const completionMetrics = metrics.filter(
      (m) => m.metricType === 'completion-rate',
    );
    if (completionMetrics.length === 0) return 0;
    return (
      completionMetrics.reduce((sum, m) => sum + m.value, 0) /
      completionMetrics.length
    );
  }

  private getNextSprintDueDate(project: Project): string {
    const activeSprint = project.sprint.find(
      (s) => s.isStarted && !s.isFinished,
    );
    if (!activeSprint || !activeSprint.fnishedAt) {
      return 'No active sprint';
    }
    return activeSprint.fnishedAt.toISOString();
  }

  private determineProjectPriority(metrics: any[]): string {
    const velocity =
      metrics.find((m) => m.metricType === 'velocity')?.value || 0;
    const completionRate =
      metrics.find((m) => m.metricType === 'completion-rate')?.value || 0;

    if (velocity > 80 && completionRate > 80) return 'high';
    if (velocity > 50 && completionRate > 50) return 'medium';
    return 'low';
  }

  private getAverageVelocity(sprintMetrics: any[][]): number {
    const velocities = sprintMetrics.flatMap((metrics) =>
      metrics.filter((m) => m.metricType === 'velocity').map((m) => m.value),
    );
    return velocities.length
      ? velocities.reduce((sum, v) => sum + v, 0) / velocities.length
      : 0;
  }

  private getAverageCompletionRate(sprintMetrics: any[][]): number {
    const rates = sprintMetrics.flatMap((metrics) =>
      metrics
        .filter((m) => m.metricType === 'completion-rate')
        .map((m) => m.value),
    );
    return rates.length
      ? rates.reduce((sum, r) => sum + r, 0) / rates.length
      : 0;
  }

  private getLatestBurndown(sprintMetrics: any[][]): number {
    const burndowns = sprintMetrics.flatMap((metrics) =>
      metrics
        .filter((m) => m.metricType === 'burndown')
        .sort((a, b) => b.recordedAt.getTime() - a.recordedAt.getTime()),
    );
    return burndowns[0]?.value || 0;
  }

  private calculateTotalCompletedTasks(projects: Project[]): number {
    return projects.reduce((sum, project) => {
      const completedIssues = project.sprint.flatMap(
        (sprint) =>
          sprint.issues?.filter((issue) =>
            ['resolved', 'closed'].includes(issue.status),
          ) || [],
      );
      return sum + completedIssues.length;
    }, 0);
  }

  private calculateTotalTasks(projects: Project[]): number {
    return projects.reduce((sum, project) => {
      const allIssues = project.sprint.flatMap((sprint) => sprint.issues || []);
      return sum + allIssues.length;
    }, 0);
  }

  private getRecentActivity(projects: Project[]): any[] {
    const allIssues = projects.flatMap((project) =>
      project.sprint.flatMap((sprint) => sprint.issues || []),
    );

    return allIssues
      .filter((issue) => ['resolved', 'closed'].includes(issue.status))
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(0, 5)
      .map((issue) => ({
        task: issue.title,
        completedAt: issue.updatedAt.toISOString(),
      }));
  }

  private async getTeamAvailability(projects: Project[]): Promise<any> {
    return {
      members: projects.flatMap((project) =>
        project.members.map((member) => ({
          name: member.user_id,
          availableSlots: [
            { day: 'Monday', startTime: '09:00', endTime: '17:00' },
            { day: 'Tuesday', startTime: '09:00', endTime: '17:00' },
            { day: 'Wednesday', startTime: '09:00', endTime: '17:00' },
            { day: 'Thursday', startTime: '09:00', endTime: '17:00' },
            { day: 'Friday', startTime: '09:00', endTime: '17:00' },
          ],
        })),
      ),
    };
  }

  private calculateProductivityStats(projectData: any[]): any {
    const velocities = projectData.map((p) => p.metrics.velocity);
    const completionRates = projectData.map((p) => p.metrics.completionRate);

    return {
      weeklyHours: this.calculateWeeklyHours(projectData),
      mostProductiveDay: this.determineMostProductiveDay(projectData),
      peakHours: this.determinePeakHours(projectData),
    };
  }

  private calculateWeeklyHours(projectData: any[]): number {
    return 40;
  }

  private determineMostProductiveDay(projectData: any[]): string {
    return 'Tuesday';
  }

  private determinePeakHours(projectData: any[]): string {
    return '09:00-11:00';
  }

  private determineResponseType(query: string): string {
    const lowerQuery = query.toLowerCase();
    if (lowerQuery.includes('productivity')) {
      return 'productivity';
    } else if (
      lowerQuery.includes('report') ||
      lowerQuery.includes('summary')
    ) {
      return 'report';
    } else if (
      lowerQuery.includes('meeting') ||
      lowerQuery.includes('schedule')
    ) {
      return 'meeting';
    }
    return 'general';
  }

  private createPrompt(query: string, userData: any): string {
    return `
Como asistente de productividad, analiza la siguiente consulta y proporciona una respuesta útil y detallada basada en los datos reales del usuario:

Consulta: "${query}"

Datos del usuario:
1. Tareas:
   - Completadas: ${userData.tasks.completed} de ${userData.tasks.total}
   - Actividad reciente: ${JSON.stringify(userData.tasks.recentActivity)}

2. Proyectos activos:
   ${userData.projects
     .map(
       (project) => `
   - ${project.name}:
     * Progreso: ${project.progress}%
     * Fecha límite: ${project.dueDate}
     * Prioridad: ${project.priority}
     * Métricas:
       - Velocidad: ${project.metrics.velocity}
       - Tasa de finalización: ${project.metrics.completionRate}%
       - Burndown actual: ${project.metrics.burndown}
   `,
     )
     .join('')}

3. Disponibilidad del equipo:
   ${userData.teamAvailability.members
     .map(
       (member) => `
   - ${member.name}:
     * Horarios disponibles: ${member.availableSlots
       .map((slot) => `${slot.day} (${slot.startTime}-${slot.endTime})`)
       .join(', ')}
   `,
     )
     .join('')}

4. Estadísticas de productividad:
   - Horas semanales: ${userData.productivityStats.weeklyHours}
   - Día más productivo: ${userData.productivityStats.mostProductiveDay}
   - Horas pico: ${userData.productivityStats.peakHours}

Considera los siguientes aspectos en tu respuesta:
1. Si es sobre productividad:
   - Usa las horas pico y el día más productivo para sugerir horarios
   - Recomienda proyectos basados en prioridades y fechas límite
   - Ofrece bloquear tiempo en el calendario

2. Si es sobre reportes o resúmenes:
   - Usa las estadísticas reales de tareas completadas
   - Menciona las horas de trabajo activo
   - Incluye tendencias basadas en la actividad reciente
   - Ofrece enviar reportes detallados

3. Si es sobre reuniones:
   - Analiza la disponibilidad real del equipo
   - Sugiere horarios basados en los slots disponibles
   - Recomienda duración según el contexto
   - Ofrece programar la reunión

4. Para consultas generales:
   - Proporciona insights basados en los datos reales
   - Sugiere optimizaciones según el progreso de los proyectos
   - Ofrece ayuda adicional

Tu respuesta debe ser:
- Clara y concisa
- Orientada a la acción
- Basada en datos reales
- Incluir una oferta de ayuda adicional
- Mantener un tono profesional pero amigable
    `;
  }
}
