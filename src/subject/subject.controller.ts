import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { SubjectService } from './subject.service';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('subjects')
export class SubjectController {
  constructor(private readonly subjectService: SubjectService) {}

  @Roles('ADMIN', 'CURATOR')
  @Get()
  findAll() {
    return this.subjectService.findAll();
  }

  @Roles('ADMIN')
  @Patch(':id')
  assignTeacher(@Param('id') id: string, @Body() body: { teacherId?: string | null }) {
    return this.subjectService.assignTeacher(id, body.teacherId ?? null);
  }
}
