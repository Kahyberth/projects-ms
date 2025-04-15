import { Incident } from 'src/incidents/entities/incident.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class ProductBacklog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'timestamp', nullable: true })
  created_date: string;

  @Column({ type: 'timestamp', nullable: true })
  updated_date: string;

  @ManyToOne(() => Incident, (incident) => incident.product_backlog)
  incident: Incident;
}
