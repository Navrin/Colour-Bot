import { Guild } from './../guild/model';
import { Entity, Column, PrimaryColumn, OneToOne, JoinColumn } from 'typeorm';
import { Colour } from '../colour/model';

import 'reflect-metadata';

@Entity()
export class User {
    @PrimaryColumn()
    id: number;

    @OneToOne(type => Colour)
    @JoinColumn()
    colour: Colour;
}
