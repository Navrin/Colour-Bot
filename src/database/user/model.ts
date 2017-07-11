import { Guild } from './../guild/model';
import { 
    Entity, 
    Column, 
    PrimaryColumn, 
    OneToOne, 
    ManyToOne, 
    ManyToMany,
    JoinTable,
    Index,
} from 'typeorm';
import { Colour } from '../colour/model';

import 'reflect-metadata';

@Entity()
@Index('user_id_index', (user: User) => [user.id])
export class User {
    @PrimaryColumn()
    @Index()
    id: string;

    @ManyToMany(type => Colour, colour => colour.users)
    @JoinTable()
    colours: Colour[];

    @ManyToMany(type => Guild, guild => guild.users)
    @JoinTable()
    guilds: Guild[];
}
